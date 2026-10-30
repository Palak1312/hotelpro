import { MongoClient } from 'mongodb'
import { HttpError } from './domain.js'
const cache = globalThis.__hotelproDatabase ||= { client: null, promise: null, indexes: null }
export async function ensureIndexes(db) {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('rooms').createIndex({ propertyId: 1, number: 1 }, { unique: true }),
    db.collection('guests').createIndex({ propertyId: 1, email: 1 }, { unique: true }),
    db.collection('reservations').createIndex({ propertyId: 1, roomId: 1, status: 1, checkIn: 1, checkOut: 1 }),
    db.collection('reservations').createIndex({ propertyId: 1, requestId: 1 }, { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } }),
    db.collection('payments').createIndex({ propertyId: 1, requestId: 1 }, { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } }),
    db.collection('audit').createIndex({ propertyId: 1, createdAt: -1 }),
    db.collection('loginAttempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ])
}
export async function database() {
  if (!process.env.MONGODB_URI) throw new HttpError(503, 'The database is not configured. Ask your administrator to complete the server setup.')
  if (!cache.promise) cache.promise = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 }).connect().catch((error) => { cache.promise = null; throw error })
  cache.client = await cache.promise
  const db = cache.client.db(process.env.MONGODB_DB || 'hotelpro')
  if (!cache.indexes) cache.indexes = ensureIndexes(db).catch((error) => { cache.indexes = null; throw error })
  await cache.indexes
  return { db, client: cache.client }
}
export async function transaction(work) {
  const { db, client } = await database()
  const session = client.startSession()
  try { return await session.withTransaction(() => work(db, session)) }
  finally { await session.endSession() }
}
