import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { database } from './db.js'
import { HttpError } from './domain.js'
function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new HttpError(503, 'Authentication is not configured. Ask your administrator to complete the server setup.')
  return process.env.JWT_SECRET
}
export const publicUser = (user) => ({ id: String(user._id), name: user.name, email: user.email, role: user.role, propertyId: user.propertyId, active: user.active })
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }
export function signToken(user) { return jwt.sign({ sub: String(user._id) }, secret(), { expiresIn: '8h', issuer: 'hotelpro', audience: 'hotelpro-web' }) }
export async function requireAuth(req, res, next) {
  try {
    if (!req.cookies.hotelpro_session) throw new HttpError(401, 'Please sign in to continue.')
    let claims
    const key = secret()
    try { claims = jwt.verify(req.cookies.hotelpro_session, key, { issuer: 'hotelpro', audience: 'hotelpro-web', algorithms: ['HS256'] }) }
    catch { throw new HttpError(401, 'Your session has expired. Please sign in again.') }
    if (!ObjectId.isValid(claims.sub)) throw new HttpError(401, 'Invalid session.')
    const { db } = await database()
    const user = await db.collection('users').findOne({ _id: new ObjectId(claims.sub), active: true })
    if (!user) throw new HttpError(401, 'Your account is no longer active.')
    req.user = user
    next()
  } catch (error) { next(error) }
}
export function requireRole(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : next(new HttpError(403, 'You do not have permission to do that.')) }
