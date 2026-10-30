import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import bcrypt from 'bcryptjs'
import { createHash, randomUUID } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { database, transaction } from './db.js'
import { requireAuth, requireRole, signToken, publicUser, cookieOptions } from './auth.js'
import { HttpError, activeStatuses, nightsBetween, todayIn, toMinor, validateTransition, paymentBalance, metricsFor } from './domain.js'

const app = express()
app.disable('x-powered-by')
app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!req.is('application/json')) return next(new HttpError(415, 'Use a JSON request body.'))
    const host = req.get('x-forwarded-host') || req.get('host')
    const origin = req.get('origin')
    try {
      if (req.get('sec-fetch-site') === 'cross-site' || (origin && new URL(origin).host !== host)) throw new Error('origin')
    } catch { return next(new HttpError(403, 'This request must come from the hotel application.')) }
  }
  next()
})
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next)
const objectId = (value) => { if (!ObjectId.isValid(value)) throw new HttpError(400, 'Invalid record identifier.'); return new ObjectId(value) }
const scope = (req) => ({ propertyId: req.user.propertyId })
const email = z.string().trim().email().max(160).transform((value) => value.toLowerCase())
const guestInput = z.object({ name: z.string().trim().min(2).max(100), email, phone: z.string().trim().max(30).default(''), notes: z.string().trim().max(1000).default('') })
const roomInput = z.object({ number: z.string().trim().min(1).max(10), type: z.string().trim().min(2).max(80), floor: z.coerce.number().int().min(0).max(100), capacity: z.coerce.number().int().min(1).max(12), nightlyRate: z.union([z.string(), z.number()]), operationalStatus: z.enum(['available', 'cleaning', 'maintenance']).default('available') })
const bookingInput = z.object({ roomId: z.string(), guest: guestInput, checkIn: z.string().date(), checkOut: z.string().date(), guests: z.coerce.number().int().min(1).max(12), requestId: z.string().uuid() })
const propertyInput = z.object({
  name: z.string().trim().min(2).max(120), email, phone: z.string().trim().max(30), address: z.string().trim().max(240),
  timezone: z.string().refine((value) => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false } }, 'Invalid time zone.'),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']), checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
})
async function propertyFor(db, propertyId, session) {
  const property = await db.collection('properties').findOne({ _id: propertyId }, { session })
  if (!property) throw new HttpError(409, 'Hotel setup is incomplete. Run the seed script for this account.')
  return property
}
async function audit(db, req, description, session) {
  await db.collection('audit').insertOne({ ...scope(req), actorId: req.user._id, actorName: req.user.name, description, createdAt: new Date() }, { session })
}
// Every booking/status change takes a write lock on its room inside a transaction.
// Concurrent bookings for that room retry against a fresh snapshot before checking dates.
async function lockRoom(db, roomId, propertyId, session) {
  const room = await db.collection('rooms').findOneAndUpdate({ _id: roomId, propertyId }, { $inc: { bookingVersion: 1 } }, { session, returnDocument: 'after' })
  if (!room) throw new HttpError(404, 'Room not found.')
  return room
}

app.get('/api/health', route(async (_req, res) => {
  const { db } = await database()
  await db.command({ ping: 1 })
  res.json({ status: 'ok', database: 'connected' })
}))
app.post('/api/auth/login', route(async (req, res) => {
  const input = z.object({ email, password: z.string().min(1).max(128) }).parse(req.body)
  const { db } = await database()
  const bucket = Math.floor(Date.now() / 900000)
  const key = createHash('sha256').update(`${input.email}:${req.ip}:${bucket}`).digest('hex')
  const attempt = await db.collection('loginAttempts').findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * 900000) } }, { upsert: true, returnDocument: 'after' })
  if (attempt.count > 12) throw new HttpError(429, 'Too many sign-in attempts. Try again in 15 minutes.')
  const user = await db.collection('users').findOne({ email: input.email, active: true })
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect.')
  await propertyFor(db, user.propertyId)
  res.cookie('hotelpro_session', signToken(user), { ...cookieOptions, maxAge: 8 * 3600000 })
  res.json({ user: publicUser(user) })
}))
app.post('/api/auth/signup', route(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100),
    email,
    password: z.string().min(12).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.'),
    propertyName: z.string().trim().min(2).max(120),
    timezone: z.string().refine((value) => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false } }, 'Invalid time zone.'),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
  }).parse(req.body)
  const { db } = await database()
  const bucket = Math.floor(Date.now() / 900000)
  const key = createHash('sha256').update(`signup:${req.ip}:${bucket}`).digest('hex')
  const attempt = await db.collection('loginAttempts').findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * 900000) } }, { upsert: true, returnDocument: 'after' })
  if (attempt.count > 5) throw new HttpError(429, 'Too many workspace sign-up attempts. Try again in 15 minutes.')
  const passwordHash = await bcrypt.hash(input.password, 12)
  const now = new Date()
  const propertyId = new ObjectId()
  const user = { _id: new ObjectId(), name: input.name, email: input.email, passwordHash, role: 'admin', active: true, propertyId, createdAt: now }
  const token = signToken(user)
  await transaction(async (_db, session) => {
    await _db.collection('properties').insertOne({ _id: propertyId, name: input.propertyName, email: input.email, phone: '', address: '', timezone: input.timezone, currency: input.currency, checkInTime: '14:00', checkOutTime: '11:00', createdAt: now, updatedAt: now }, { session })
    await _db.collection('users').insertOne(user, { session })
  })
  res.cookie('hotelpro_session', token, { ...cookieOptions, maxAge: 8 * 3600000 })
  res.status(201).json({ user: publicUser(user) })
}))
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('hotelpro_session', cookieOptions); res.json({ ok: true }) })
app.use('/api', requireAuth)
app.get('/api/auth/me', (req, res) => res.json({ user: publicUser(req.user) }))

app.get('/api/state', route(async (req, res) => {
  const { db } = await database()
  const property = await propertyFor(db, req.user.propertyId)
  const [rooms, guests, reservations, payments, activity, staff] = await Promise.all([
    db.collection('rooms').find(scope(req)).sort({ number: 1 }).toArray(),
    db.collection('guests').find(scope(req)).sort({ name: 1 }).toArray(),
    db.collection('reservations').find(scope(req)).sort({ checkIn: -1, createdAt: -1 }).toArray(),
    db.collection('payments').find(scope(req)).sort({ createdAt: -1 }).toArray(),
    db.collection('audit').find(scope(req)).sort({ createdAt: -1 }).limit(30).toArray(),
    req.user.role === 'admin' ? db.collection('users').find(scope(req), { projection: { passwordHash: 0 } }).sort({ name: 1 }).toArray() : [],
  ])
  if (rooms.some((r) => !Number.isSafeInteger(r.nightlyRateMinor)) || reservations.some((r) => !Number.isSafeInteger(r.totalMinor))) throw new HttpError(409, 'This database contains records from an older app version. Use the documented new-database setup before continuing.')
  res.json({ property, rooms, guests, reservations, payments, activity, staff: staff.map(publicUser), metrics: metricsFor(rooms, reservations, payments, property.timezone), syncedAt: new Date().toISOString() })
}))

app.get('/api/availability', route(async (req, res) => {
  const input = z.object({ checkIn: z.string().date(), checkOut: z.string().date(), guests: z.coerce.number().int().min(1).max(12) }).parse(req.query)
  const nights = nightsBetween(input.checkIn, input.checkOut)
  const { db } = await database()
  const booked = await db.collection('reservations').find({ ...scope(req), status: { $in: activeStatuses }, checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn } }, { projection: { roomId: 1 } }).toArray()
  const rooms = await db.collection('rooms').find({ ...scope(req), _id: { $nin: booked.map((r) => r.roomId) }, operationalStatus: { $ne: 'maintenance' }, capacity: { $gte: input.guests } }).sort({ number: 1 }).toArray()
  res.json({ rooms, nights })
}))
app.post('/api/reservations', route(async (req, res) => {
  const input = bookingInput.parse(req.body)
  const nights = nightsBetween(input.checkIn, input.checkOut)
  const roomId = objectId(input.roomId)
  const reservation = await transaction(async (db, session) => {
    const existing = await db.collection('reservations').findOne({ ...scope(req), requestId: input.requestId }, { session })
    if (existing) {
      if (String(existing.roomId) !== input.roomId || existing.checkIn !== input.checkIn || existing.checkOut !== input.checkOut || existing.guests !== input.guests || existing.guestEmail !== input.guest.email) throw new HttpError(409, 'This reservation request was already saved with different details. Refresh before making another booking.')
      return existing
    }
    const room = await lockRoom(db, roomId, req.user.propertyId, session)
    const property = await propertyFor(db, req.user.propertyId, session)
    if (input.checkIn < todayIn(property.timezone)) throw new HttpError(400, 'Check-in cannot be in the past.')
    if (room.operationalStatus === 'maintenance' || room.capacity < input.guests) throw new HttpError(409, 'This room is unavailable for the selected party.')
    if (!Number.isSafeInteger(room.nightlyRateMinor) || room.nightlyRateMinor <= 0) throw new HttpError(409, 'Set a valid nightly rate for this room first.')
    const conflict = await db.collection('reservations').findOne({ ...scope(req), roomId, status: { $in: activeStatuses }, checkIn: { $lt: input.checkOut }, checkOut: { $gt: input.checkIn } }, { session })
    if (conflict) throw new HttpError(409, 'That room was booked for these dates. Choose another available room.')
    let guest = await db.collection('guests').findOne({ ...scope(req), email: input.guest.email }, { session })
    if (!guest) {
      guest = { _id: new ObjectId(), ...scope(req), ...input.guest, createdAt: new Date(), updatedAt: new Date() }
      await db.collection('guests').insertOne(guest, { session })
    }
    const row = { _id: new ObjectId(), ...scope(req), requestId: input.requestId, reference: `HP-${randomUUID().slice(0, 8).toUpperCase()}`, roomId, roomNumber: room.number, roomType: room.type, guestId: guest._id, guestName: guest.name, guestEmail: guest.email, checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guests, nights, nightlyRateMinor: room.nightlyRateMinor, totalMinor: room.nightlyRateMinor * nights, paidMinor: 0, currency: property.currency, status: 'confirmed', createdAt: new Date(), updatedAt: new Date() }
    await db.collection('reservations').insertOne(row, { session })
    await audit(db, req, `Created reservation ${row.reference} for ${guest.name}, room ${room.number}.`, session)
    return row
  })
  res.status(201).json({ reservation })
}))
app.patch('/api/reservations/:id/status', route(async (req, res) => {
  const _id = objectId(req.params.id)
  const { status } = z.object({ status: z.enum(['checked-in', 'checked-out', 'cancelled']) }).parse(req.body)
  const reservation = await transaction(async (db, session) => {
    const row = await db.collection('reservations').findOne({ _id, ...scope(req) }, { session })
    if (!row) throw new HttpError(404, 'Reservation not found.')
    const room = await lockRoom(db, row.roomId, req.user.propertyId, session)
    const property = await propertyFor(db, req.user.propertyId, session)
    validateTransition(row, status, todayIn(property.timezone))
    if (status === 'checked-in') {
      const occupied = await db.collection('reservations').findOne({ ...scope(req), roomId: row.roomId, status: 'checked-in' }, { session })
      if (occupied || room.operationalStatus !== 'available') throw new HttpError(409, 'The room must be vacant and ready before check-in.')
    }
    await db.collection('reservations').updateOne({ _id, ...scope(req) }, { $set: { status, updatedAt: new Date(), ...(status === 'checked-in' ? { actualCheckIn: new Date() } : status === 'checked-out' ? { actualCheckOut: new Date() } : {}) } }, { session })
    if (status === 'checked-out') await db.collection('rooms').updateOne({ _id: room._id }, { $set: { operationalStatus: 'cleaning', updatedAt: new Date() } }, { session })
    await audit(db, req, `${row.reference}: ${status.replaceAll('-', ' ')}.`, session)
    return { ...row, status }
  })
  res.json({ reservation })
}))

app.post('/api/reservations/:id/payment', route(async (req, res) => {
  const reservationId = objectId(req.params.id)
  const input = z.object({ amount: z.union([z.string(), z.number()]), method: z.enum(['cash', 'upi', 'bank-transfer', 'external-card']), reference: z.string().trim().max(120).default(''), requestId: z.string().uuid() }).parse(req.body)
  const amountMinor = toMinor(input.amount)
  if (input.method !== 'cash' && !input.reference) throw new HttpError(400, 'Enter the transaction reference for this payment.')
  const payment = await transaction(async (db, session) => {
    const existing = await db.collection('payments').findOne({ ...scope(req), requestId: input.requestId }, { session })
    if (existing) {
      if (String(existing.reservationId) !== String(reservationId) || existing.amountMinor !== amountMinor || existing.method !== input.method || existing.reference !== input.reference) throw new HttpError(409, 'This payment request was already saved with different details. Refresh before recording another payment.')
      return existing
    }
    const reservation = await db.collection('reservations').findOne({ _id: reservationId, ...scope(req) }, { session })
    if (!reservation) throw new HttpError(404, 'Reservation not found.')
    paymentBalance(reservation, amountMinor)
    await db.collection('reservations').updateOne({ _id: reservationId, ...scope(req) }, { $inc: { paidMinor: amountMinor }, $set: { updatedAt: new Date() } }, { session })
    const row = { _id: new ObjectId(), ...scope(req), reservationId, reservationReference: reservation.reference, guestName: reservation.guestName, amountMinor, currency: reservation.currency, method: input.method, reference: input.reference, requestId: input.requestId, recordedBy: req.user._id, createdAt: new Date() }
    await db.collection('payments').insertOne(row, { session })
    await audit(db, req, `Recorded ${input.method} payment for ${reservation.reference}.`, session)
    return row
  })
  res.status(201).json({ payment })
}))

app.post('/api/rooms', requireRole('admin', 'manager'), route(async (req, res) => {
  const { nightlyRate, ...input } = roomInput.parse(req.body)
  const room = await transaction(async (db, session) => {
    const row = { _id: new ObjectId(), ...scope(req), ...input, nightlyRateMinor: toMinor(nightlyRate), bookingVersion: 0, createdAt: new Date(), updatedAt: new Date() }
    await db.collection('rooms').insertOne(row, { session })
    await audit(db, req, `Added room ${row.number}.`, session)
    return row
  })
  res.status(201).json({ room })
}))
app.patch('/api/rooms/:id', requireRole('admin', 'manager', 'frontdesk'), route(async (req, res) => {
  const _id = objectId(req.params.id)
  const input = roomInput.partial().parse(req.body)
  if (req.user.role === 'frontdesk' && Object.keys(input).some((key) => key !== 'operationalStatus')) throw new HttpError(403, 'Only managers can edit room rates and details.')
  const room = await transaction(async (db, session) => {
    const current = await lockRoom(db, _id, req.user.propertyId, session)
    const occupied = await db.collection('reservations').findOne({ ...scope(req), roomId: _id, status: 'checked-in' }, { session })
    if (occupied && input.operationalStatus) throw new HttpError(409, 'Check out the current guest before changing room readiness.')
    if (input.capacity !== undefined && input.capacity < current.capacity) {
      const largerParty = await db.collection('reservations').findOne({ ...scope(req), roomId: _id, status: { $in: activeStatuses }, guests: { $gt: input.capacity } }, { session })
      if (largerParty) throw new HttpError(409, 'An active reservation needs the current room capacity.')
    }
    if ((input.number && input.number !== current.number) || (input.type && input.type !== current.type)) {
      const booked = await db.collection('reservations').findOne({ ...scope(req), roomId: _id, status: { $in: activeStatuses } }, { session })
      if (booked) throw new HttpError(409, 'Resolve active stays before changing a room number or type.')
    }
    if (input.operationalStatus === 'maintenance') {
      const booked = await db.collection('reservations').findOne({ ...scope(req), roomId: _id, status: { $in: activeStatuses } }, { session })
      if (booked) throw new HttpError(409, 'This room has active reservations. Resolve them before putting it under maintenance.')
    }
    const { nightlyRate, ...changes } = input
    if (nightlyRate !== undefined) changes.nightlyRateMinor = toMinor(nightlyRate)
    await db.collection('rooms').updateOne({ _id, ...scope(req) }, { $set: { ...changes, updatedAt: new Date() } }, { session })
    await audit(db, req, `Updated room ${current.number}.`, session)
    return { ...current, ...changes }
  })
  res.json({ room })
}))

app.post('/api/guests', route(async (req, res) => {
  const input = guestInput.parse(req.body)
  const guest = await transaction(async (db, session) => {
    const row = { _id: new ObjectId(), ...scope(req), ...input, createdAt: new Date(), updatedAt: new Date() }
    await db.collection('guests').insertOne(row, { session })
    await audit(db, req, `Added guest ${row.name}.`, session)
    return row
  })
  res.status(201).json({ guest })
}))
app.patch('/api/guests/:id', route(async (req, res) => {
  const _id = objectId(req.params.id)
  const input = guestInput.parse(req.body)
  const guest = await transaction(async (db, session) => {
    const row = await db.collection('guests').findOneAndUpdate({ _id, ...scope(req) }, { $set: { ...input, updatedAt: new Date() } }, { session, returnDocument: 'after' })
    if (!row) throw new HttpError(404, 'Guest not found.')
    await audit(db, req, `Updated guest ${row.name}.`, session)
    return row
  })
  res.json({ guest })
}))
app.put('/api/property', requireRole('admin', 'manager'), route(async (req, res) => {
  const input = propertyInput.parse(req.body)
  const property = await transaction(async (db, session) => {
    const current = await propertyFor(db, req.user.propertyId, session)
    if (current.currency !== input.currency) throw new HttpError(409, 'Currency cannot be changed after setup; existing room rates and payments use it.')
    await db.collection('properties').updateOne({ _id: current._id }, { $set: { ...input, updatedAt: new Date() } }, { session })
    await audit(db, req, 'Updated property profile and check-in policies.', session)
    return { ...current, ...input }
  })
  res.json({ property })
}))
app.post('/api/staff', requireRole('admin'), route(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(100), email, password: z.string().min(12).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.'), role: z.enum(['manager', 'frontdesk']) }).parse(req.body)
  const passwordHash = await bcrypt.hash(input.password, 12)
  const user = await transaction(async (db, session) => {
    const row = { _id: new ObjectId(), ...scope(req), name: input.name, email: input.email, role: input.role, passwordHash, active: true, createdAt: new Date() }
    await db.collection('users').insertOne(row, { session })
    await audit(db, req, `Created staff account for ${row.name}.`, session)
    return row
  })
  res.status(201).json({ user: publicUser(user) })
}))
app.patch('/api/staff/:id', requireRole('admin'), route(async (req, res) => {
  const _id = objectId(req.params.id)
  const { active } = z.object({ active: z.boolean() }).parse(req.body)
  if (String(_id) === String(req.user._id)) throw new HttpError(400, 'You cannot deactivate your own account.')
  await transaction(async (db, session) => {
    const user = await db.collection('users').findOneAndUpdate({ _id, ...scope(req), role: { $ne: 'admin' } }, { $set: { active } }, { session, returnDocument: 'after' })
    if (!user) throw new HttpError(404, 'Staff account not found or is an administrator.')
    await audit(db, req, `${active ? 'Activated' : 'Deactivated'} staff account for ${user.name}.`, session)
  })
  res.json({ ok: true })
}))
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API endpoint not found.')))
app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') })
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message })
  if (error?.code === 11000) return res.status(409).json({ error: 'A record with these details already exists. Refresh and try again.' })
  if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' })
  console.error('HotelPro request failed:', error?.name, error?.code || '')
  res.status(503).json({ error: 'The database is unavailable. Please retry; your request has not been confirmed.' })
})
export default app
