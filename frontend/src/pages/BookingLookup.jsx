import React, { useState } from 'react';
import { lookupBooking } from '../api/bookings';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

const STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  'checked-in': 'info',
  'checked-out': 'default',
};

export default function BookingLookup() {
  const [reference, setReference] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const ref = reference.trim().toUpperCase();
    if (!ref) { setError('Please enter your booking reference.'); return; }

    setLoading(true);
    setError('');
    setBooking(null);

    try {
      const data = await lookupBooking(ref);
      setBooking(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nights = booking
    ? Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="page-wrapper">
      <div className="page-hero page-hero--lookup">
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <p className="section__eyebrow">Manage Booking</p>
          <h1>Find Your Booking</h1>
          <p>Enter your booking reference to view your reservation details.</p>
        </div>
      </div>

      <div className="container section">
        <div className="lookup-wrapper">
          <form className="lookup-form" onSubmit={handleSearch}>
            <div className="lookup-form__input-row">
              <input
                type="text"
                placeholder="e.g. HP-ABC123XY"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                className="lookup-form__input"
                aria-label="Booking reference"
                autoFocus
              />
              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Search'}
              </button>
            </div>
            <p className="lookup-form__hint">
              Your reference was shown on the confirmation page (format: HP-XXXXXXXX).
            </p>
          </form>

          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {booking && (
            <div className="booking-result">
              <div className="booking-result__header">
                <div>
                  <h2>{booking.room?.name}</h2>
                  <p>Booking Reference: <strong>{booking.bookingReference}</strong></p>
                </div>
                <span className={`status-badge status-badge--${booking.status}`}>
                  {booking.status.toUpperCase()}
                </span>
              </div>

              <div className="booking-result__grid">
                <div className="booking-result__section">
                  <h4>Guest</h4>
                  <p>{booking.guestName}</p>
                  <p>{booking.guestEmail}</p>
                  {booking.guestPhone && <p>{booking.guestPhone}</p>}
                </div>
                <div className="booking-result__section">
                  <h4>Room</h4>
                  <p>{booking.room?.type} — Room {booking.room?.roomNumber}</p>
                </div>
                <div className="booking-result__section">
                  <h4>Dates</h4>
                  <p>Check-in: <strong>{fmt(booking.checkIn)}</strong></p>
                  <p>Check-out: <strong>{fmt(booking.checkOut)}</strong></p>
                  <p>{nights} night{nights !== 1 ? 's' : ''} · {booking.guests} guest{booking.guests !== 1 ? 's' : ''}</p>
                </div>
                <div className="booking-result__section">
                  <h4>Payment</h4>
                  <p className="booking-result__total">${booking.totalPrice}</p>
                  <p className="booking-result__payment-badge">💳 DEMO PAID</p>
                </div>
              </div>

              {booking.specialRequests && (
                <div className="booking-result__requests">
                  <h4>Special Requests</h4>
                  <p>{booking.specialRequests}</p>
                </div>
              )}

              <p className="booking-result__booked-on">
                Booked on {new Date(booking.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
