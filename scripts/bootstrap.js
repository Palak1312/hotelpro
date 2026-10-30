import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import { MongoClient, ObjectId } from 'mongodb'
import { z } from 'zod'
import { ensureIndexes } from '../server/db.js'
import { toMinor } from '../server/domain.js'

const config = z.object({
  MONGODB_URI: z.string().min(10), MONGODB_DB: z.string().min(1).default('hotelpro'), JWT_SECRET: z.string().min(32),
  SEED_ADMIN_EMAIL: z.string().email().transform((value) => value.toLowerCase()),
  SEED_ADMIN_PASSWORD: z.string().min(12).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.'),
  SEED_ADMIN_NAME: z.string().min(2).default('Administrator'), SEED_PROPERTY_NAME: z.string().min(2),
  SEED_PROPERTY_ID: z.string().regex(/^[a-z0-9-]+$/).default('hotelpro'), SEED_PROPERTY_ADDRESS: z.string().default(''), SEED_PROPERTY_PHONE: z.string().default(''),
}).safeParse(process.env)
if (!config.success) {
  console.error('Seed configuration is incomplete. Set these fields in .env:')
  for (const issue of config.error.issues) console.error(`${issue.path.join('.')}: ${issue.message}`)
  process.exitCode = 1
} else {
  const env = config.data
  const input = z.object({
    property: z.object({ timezone: z.string(), currency: z.enum(['INR', 'USD', 'EUR', 'GBP']), checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }),
    rooms: z.array(z.object({ number: z.string().min(1).max(10), type: z.string().min(2), floor: z.number().int().min(0), capacity: z.number().int().min(1).max(12), nightlyRate: z.string() })),
  }).parse(JSON.parse(await readFile(new URL('./seed-data.json', import.meta.url), 'utf8')))
  new Intl.DateTimeFormat('en', { timeZone: input.property.timezone })
  if (new Set(input.rooms.map((room) => room.number)).size !== input.rooms.length) throw new Error('Duplicate room numbers in seed-data.json.')
  const rooms = input.rooms.map(({ nightlyRate, ...room }) => ({ ...room, nightlyRateMinor: toMinor(nightlyRate) }))
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  try {
    await client.connect()
    const db = client.db(env.MONGODB_DB)
    await ensureIndexes(db)
    const session = client.startSession()
    const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12)
    const propertyId = env.SEED_PROPERTY_ID
    const now = new Date()
    try {
      await session.withTransaction(async () => {
        const existingUser = await db.collection('users').findOne({ email: env.SEED_ADMIN_EMAIL }, { session })
        if (existingUser && (existingUser.propertyId !== propertyId || existingUser.role !== 'admin')) throw new Error('This admin email already belongs to a different property or role. Choose a new email or database; the existing account was not changed.')
        await db.collection('properties').updateOne({ _id: propertyId }, { $setOnInsert: { ...input.property, name: env.SEED_PROPERTY_NAME, email: env.SEED_ADMIN_EMAIL, address: env.SEED_PROPERTY_ADDRESS, phone: env.SEED_PROPERTY_PHONE, createdAt: now, updatedAt: now } }, { upsert: true, session })
        await db.collection('users').updateOne({ email: env.SEED_ADMIN_EMAIL }, { $setOnInsert: { _id: new ObjectId(), name: env.SEED_ADMIN_NAME, email: env.SEED_ADMIN_EMAIL, propertyId, role: 'admin', active: true, passwordHash, createdAt: now } }, { upsert: true, session })
        for (const room of rooms) await db.collection('rooms').updateOne({ propertyId, number: room.number }, { $setOnInsert: { ...room, propertyId, operationalStatus: 'available', bookingVersion: 0, createdAt: now, updatedAt: now } }, { upsert: true, session })
      })
    } finally { await session.endSession() }
    console.log(`Setup complete for ${env.SEED_PROPERTY_NAME}.`)
    console.log(`Administrator: ${env.SEED_ADMIN_EMAIL}`)
    console.log(`Rooms: ${await db.collection('rooms').countDocuments({ propertyId })}. Existing settings, room edits and passwords were preserved.`)
    console.log('No guest stays or payment records were generated.')
  } catch (error) {
    console.error(`Seed failed (${error.name || 'Error'}). ${error.message?.startsWith('This admin email') ? error.message : 'Check the Atlas connection, network access, database permissions and seed configuration.'}`)
    process.exitCode = 1
  } finally { await client.close() }
}
