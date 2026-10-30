import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays, todayIn, nightsBetween, toMinor, overlaps, validateTransition, paymentBalance, metricsFor } from '../server/domain.js'

test('hotel dates use the property time zone and calendar arithmetic', () => {
  assert.equal(todayIn('Asia/Kolkata', new Date('2026-10-27T20:00:00Z')), '2026-10-28')
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
  assert.equal(nightsBetween('2026-03-07', '2026-03-10'), 3)
  assert.throws(() => nightsBetween('2026-10-27', '2026-10-27'))
  assert.throws(() => nightsBetween('2026-10-28', '2026-10-27'))
})
test('money uses exact minor units and rejects invalid precision or negative amounts', () => {
  assert.equal(toMinor('1.01'), 101)
  assert.equal(toMinor('5500'), 550000)
  assert.equal(toMinor('0.10'), 10)
  for (const value of ['-1', '0', 'NaN', '1.001', '1e3']) assert.throws(() => toMinor(value))
})
test('check-out is exclusive so back-to-back stays do not overlap', () => {
  const stay = { checkIn: '2026-10-27', checkOut: '2026-10-29' }
  assert.equal(overlaps(stay, { checkIn: '2026-10-29', checkOut: '2026-11-01' }), false)
  assert.equal(overlaps(stay, { checkIn: '2026-10-28', checkOut: '2026-11-01' }), true)
})
test('reservation lifecycle enforces dates, paid balances and terminal states', () => {
  const row = { status: 'confirmed', checkIn: '2026-10-27', checkOut: '2026-10-29', totalMinor: 10000, paidMinor: 0 }
  assert.doesNotThrow(() => validateTransition(row, 'checked-in', '2026-10-27'))
  assert.throws(() => validateTransition(row, 'checked-in', '2026-10-26'))
  assert.throws(() => validateTransition(row, 'checked-in', '2026-10-29'))
  assert.throws(() => validateTransition({ ...row, status: 'checked-in' }, 'checked-out', '2026-10-28'))
  assert.doesNotThrow(() => validateTransition({ ...row, status: 'checked-in', paidMinor: 10000 }, 'checked-out', '2026-10-28'))
  assert.throws(() => validateTransition({ ...row, paidMinor: 100 }, 'cancelled', '2026-10-27'))
  assert.throws(() => validateTransition({ ...row, status: 'checked-out' }, 'checked-in', '2026-10-27'))
})
test('partial payments reduce the balance and cannot overpay or pay cancelled stays', () => {
  const row = { status: 'confirmed', totalMinor: 10000, paidMinor: 4000 }
  assert.equal(paymentBalance(row, 3000), 3000)
  assert.equal(paymentBalance(row, 6000), 0)
  assert.throws(() => paymentBalance(row, 6001))
  assert.throws(() => paymentBalance({ ...row, status: 'cancelled' }, 100))
})
test('empty and populated dashboards derive totals only from persisted records', () => {
  const empty = metricsFor([], [], [], 'UTC')
  assert.equal(empty.occupancy, 0); assert.equal(empty.collectedMinor, 0)
  assert.ok(empty.week.every((point) => point.percent === 0))
  const today = todayIn('UTC')
  const reservations = [
    { roomId: 'a', status: 'checked-in', checkIn: today, checkOut: addDays(today, 1), totalMinor: 10000, paidMinor: 4000 },
    { roomId: 'b', status: 'cancelled', checkIn: today, checkOut: addDays(today, 1), totalMinor: 90000, paidMinor: 0 },
  ]
  const metrics = metricsFor([{ _id: 'a' }, { _id: 'b' }], reservations, [{ amountMinor: 4000 }], 'UTC')
  assert.equal(metrics.occupancy, 50); assert.equal(metrics.outstandingMinor, 6000)
  assert.equal(metrics.collectedMinor, 4000); assert.equal(metrics.week.at(-1).percent, 50)
})
