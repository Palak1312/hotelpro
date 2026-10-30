export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
export function todayIn(timezone = 'Asia/Kolkata', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-')
}
export function addDays(date, count) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + count)
  return value.toISOString().slice(0, 10)
}
export function nightsBetween(start, end) {
  const count = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000
  if (!Number.isInteger(count) || count < 1 || count > 365) throw new HttpError(400, 'A stay must be between 1 and 365 nights.')
  return count
}
export function toMinor(value) {
  const text = String(value)
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) throw new HttpError(400, 'Enter a positive amount with no more than two decimal places.')
  const [whole, decimal = ''] = text.split('.')
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, '0'))
  if (amount <= 0) throw new HttpError(400, 'Amount must be greater than zero.')
  return amount
}
export function overlaps(a, b) { return a.checkIn < b.checkOut && a.checkOut > b.checkIn }
export const activeStatuses = ['confirmed', 'checked-in']
export function validateTransition(reservation, status, today) {
  const allowed = { confirmed: ['checked-in', 'cancelled'], 'checked-in': ['checked-out'] }
  if (!allowed[reservation.status]?.includes(status)) throw new HttpError(409, 'That reservation status change is not allowed.')
  if (status === 'checked-in' && (today < reservation.checkIn || today >= reservation.checkOut)) throw new HttpError(409, 'Check-in is available only during the booked stay dates.')
  if (status === 'checked-out' && reservation.paidMinor < reservation.totalMinor) throw new HttpError(409, 'Record the outstanding payment before checking out.')
  if (status === 'cancelled' && reservation.paidMinor > 0) throw new HttpError(409, 'A reservation with recorded payments cannot be cancelled here. Reconcile the payment first.')
}
export function paymentBalance(reservation, amountMinor) {
  const balance = reservation.totalMinor - reservation.paidMinor
  if (reservation.status === 'cancelled') throw new HttpError(409, 'Payments cannot be recorded against a cancelled reservation.')
  if (amountMinor <= 0 || amountMinor > balance) throw new HttpError(409, 'The payment exceeds the outstanding balance.')
  return balance - amountMinor
}
export function metricsFor(rooms, reservations, payments, timezone) {
  const today = todayIn(timezone)
  const live = reservations.filter((r) => r.status === 'checked-in')
  const occupied = new Set(live.map((r) => String(r.roomId))).size
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    const booked = new Set(reservations.filter((r) => r.status !== 'cancelled' && r.checkIn <= date && r.checkOut > date).map((r) => String(r.roomId))).size
    return { date, booked, percent: rooms.length ? Math.round(booked / rooms.length * 100) : 0 }
  })
  return { today, occupied, occupancy: rooms.length ? Math.round(occupied / rooms.length * 100) : 0,
    arrivals: reservations.filter((r) => r.checkIn === today && r.status === 'confirmed').length,
    departures: live.filter((r) => r.checkOut <= today).length,
    collectedMinor: payments.reduce((sum, p) => sum + p.amountMinor, 0),
    outstandingMinor: reservations.filter((r) => r.status !== 'cancelled').reduce((sum, r) => sum + Math.max(0, r.totalMinor - r.paidMinor), 0), week }
}
