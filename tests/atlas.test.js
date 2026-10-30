import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { randomUUID, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { todayIn, addDays } from '../server/domain.js'

test('Atlas transactions, authentication, tenant isolation and received payments', { skip: !process.env.TEST_MONGODB_URI }, async () => {
  // A fresh, uniquely named database is used; the application's database is untouched.
  const name = `hotelpro_test_${randomUUID().replaceAll('-', '')}`
  process.env.MONGODB_URI = process.env.TEST_MONGODB_URI
  process.env.MONGODB_DB = name
  process.env.JWT_SECRET = randomBytes(48).toString('hex')
  process.env.NODE_ENV = 'test'
  const { default: app } = await import('../server/app.js')
  const { database } = await import('../server/db.js')
  const { db, client } = await database()
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  async function request(path, method = 'GET', body, cookie, headers = {}) {
    const response = await fetch(`${base}/api${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
  }
  try {
    const registration = { name: 'New Workspace Owner', email: 'owner@test.invalid', password: randomBytes(18).toString('hex'), propertyName: 'New Workspace Hotel', timezone: 'UTC', currency: 'USD' }
    const registered = await request('/auth/signup', 'POST', registration)
    assert.equal(registered.status, 201)
    assert.ok(registered.cookie)
    const initialState = await request('/state', 'GET', undefined, registered.cookie)
    assert.equal(initialState.status, 200)
    assert.equal(initialState.body.property.name, registration.propertyName)
    assert.equal(initialState.body.rooms.length, 0, 'Signup must not invent room inventory.')
    assert.equal(initialState.body.reservations.length, 0)
    assert.equal(initialState.body.payments.length, 0)
    assert.equal((await request('/auth/signup', 'POST', registration)).status, 409, 'Account email is unique.')
    const password = randomBytes(18).toString('hex')
    const passwordHash = await bcrypt.hash(password, 4)
    const admin = { _id: new ObjectId(), name: 'Integration administrator', email: 'admin@test.invalid', passwordHash, active: true, role: 'admin', propertyId: 'a' }
    const clerk = { ...admin, _id: new ObjectId(), name: 'Integration clerk', email: 'clerk@test.invalid', role: 'frontdesk' }
    const other = { ...admin, _id: new ObjectId(), email: 'other@test.invalid', propertyId: 'b' }
    await db.collection('users').insertMany([admin, clerk, other])
    await db.collection('properties').insertMany(['a', 'b'].map((_id) => ({ _id, name: `Integration property ${_id}`, timezone: 'UTC', currency: 'INR', email: admin.email, checkInTime: '14:00', checkOutTime: '11:00' })))
    const room = { _id: new ObjectId(), propertyId: 'a', number: '101', type: 'King', capacity: 2, floor: 1, nightlyRateMinor: 100000, operationalStatus: 'available', bookingVersion: 0 }
    const nextRoom = { ...room, _id: new ObjectId(), number: '102' }
    await db.collection('rooms').insertMany([room, nextRoom])
    assert.equal((await request('/state')).status, 401)
    assert.equal((await request('/auth/login', 'POST', { email: admin.email, password: 'incorrect' })).status, 401)
    const login = await request('/auth/login', 'POST', { email: admin.email, password })
    assert.equal(login.status, 200); assert.ok(login.cookie)
    const cookie = login.cookie
    const today = todayIn('UTC')
    const input = { roomId: String(room._id), checkIn: today, checkOut: addDays(today, 2), guests: 2, guest: { name: 'Integration guest', email: 'guest@test.invalid', phone: '', notes: '' }, totalMinor: 1 }
    const attempts = await Promise.all([0, 1].map(() => request('/reservations', 'POST', { ...input, requestId: randomUUID() }, cookie)))
    assert.deepEqual(attempts.map((r) => r.status).sort(), [201, 409], 'Exactly one concurrent request may reserve the same room.')
    const reservation = attempts.find((r) => r.status === 201).body.reservation
    assert.equal(reservation.totalMinor, 200000, 'The server ignores a client-supplied price.')
    const availability = await request(`/availability?checkIn=${today}&checkOut=${addDays(today, 2)}&guests=2`, 'GET', undefined, cookie)
    assert.deepEqual(availability.body.rooms.map((r) => r.number), ['102'])
    const adjacent = await request(`/availability?checkIn=${addDays(today, 2)}&checkOut=${addDays(today, 3)}&guests=2`, 'GET', undefined, cookie)
    assert.equal(adjacent.body.rooms.length, 2)
    const payment = { amount: '300.00', method: 'cash', reference: '', requestId: randomUUID() }
    const paymentPath = `/reservations/${reservation._id}/payment`
    assert.equal((await request(paymentPath, 'POST', payment, cookie)).status, 201)
    assert.equal((await request(paymentPath, 'POST', payment, cookie)).status, 201)
    assert.equal(await db.collection('payments').countDocuments({ reservationId: new ObjectId(reservation._id) }), 1)
    assert.equal((await request(paymentPath, 'POST', { ...payment, requestId: randomUUID(), amount: '999999' }, cookie)).status, 409)
    const statusPath = `/reservations/${reservation._id}/status`
    assert.equal((await request(statusPath, 'PATCH', { status: 'checked-in' }, cookie)).status, 200)
    assert.equal((await request(statusPath, 'PATCH', { status: 'checked-out' }, cookie)).status, 409)
    assert.equal((await request(`/rooms/${room._id}`, 'PATCH', { operationalStatus: 'maintenance' }, cookie)).status, 409)
    assert.equal((await request(paymentPath, 'POST', { ...payment, requestId: randomUUID(), amount: '1700.00' }, cookie)).status, 201)
    assert.equal((await request(statusPath, 'PATCH', { status: 'checked-out' }, cookie)).status, 200)
    assert.equal((await db.collection('rooms').findOne({ _id: room._id })).operationalStatus, 'cleaning')
    const otherLogin = await request('/auth/login', 'POST', { email: other.email, password })
    assert.equal((await request('/state', 'GET', undefined, otherLogin.cookie)).body.reservations.length, 0)
    assert.equal((await request(statusPath, 'PATCH', { status: 'cancelled' }, otherLogin.cookie)).status, 404)
    const clerkLogin = await request('/auth/login', 'POST', { email: clerk.email, password })
    assert.equal((await request('/rooms', 'POST', {}, clerkLogin.cookie)).status, 403)
    assert.equal((await request('/guests', 'POST', input.guest, cookie, { Origin: 'https://untrusted.invalid' })).status, 403)
    assert.equal((await request(`/staff/${clerk._id}`, 'PATCH', { active: false }, cookie)).status, 200)
    assert.equal((await request('/state', 'GET', undefined, clerkLogin.cookie)).status, 401)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    assert.ok(db.databaseName === name && name.startsWith('hotelpro_test_'))
    await db.dropDatabase()
    await client.close()
  }
})
