import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function Confirmation() {
  const { state } = useLocation();
  const booking = state?.booking;

  if (!booking) return <Navigate to="/rooms" replace />;

  const nights = Math.ceil(
    (new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="page-wrapper">
      <div className="container section">
        <div className="confirmation">
          {/* Success header */}
          <div className="confirmation__header">
            <div className="confirmation__check">✓</div>
            <h1>Booking Confirmed!</h1>
            <p>Your reservation has been successfully placed. Save your reference number below.</p>
          </div>

          {/* Reference */}
          <div className="confirmation__ref-box">
            <p className="confirmation__ref-label">Booking Reference</p>
            <p className="confirmation__ref">{booking.bookingReference}</p>
            <p className="confirmation__ref-hint">Use this to look up or manage your booking.</p>
          </div>

          {/* Details grid */}
          <div className="confirmation__details">
            <div className="confirmation__section">
              <h3>Guest Details</h3>
              <div className="detail-row"><span>Name</span><strong>{booking.guestName}</strong></div>
              <div className="detail-row"><span>Email</span><strong>{booking.guestEmail}</strong></div>
              {booking.guestPhone && <div className="detail-row"><span>Phone</span><strong>{booking.guestPhone}</strong></div>}
            </div>

            <div className="confirmation__section">
              <h3>Room Details</h3>
              <div className="detail-row"><span>Room</span><strong>{booking.room?.name}</strong></div>
              <div className="detail-row"><span>Type</span><strong>{booking.room?.type}</strong></div>
              <div className="detail-row"><span>Room No.</span><strong>{booking.room?.roomNumber}</strong></div>
            </div>

            <div className="confirmation__section">
              <h3>Stay Details</h3>
              <div className="detail-row"><span>Check-in</span><strong>{fmt(booking.checkIn)}</strong></div>
              <div className="detail-row"><span>Check-out</span><strong>{fmt(booking.checkOut)}</strong></div>
              <div className="detail-row"><span>Nights</span><strong>{nights}</strong></div>
              <div className="detail-row"><span>Guests</span><strong>{booking.guests}</strong></div>
            </div>

            <div className="confirmation__section">
              <h3>Payment</h3>
              <div className="detail-row"><span>Total</span><strong>${booking.totalPrice}</strong></div>
              <div className="detail-row">
                <span>Status</span>
                <strong className="confirmation__payment-badge">
                  💳 DEMO PAID
                </strong>
              </div>
              <div className="detail-row"><span>Booking Status</span>
                <strong className={`status-badge status-badge--${booking.status}`}>
                  {booking.status.toUpperCase()}
                </strong>
              </div>
            </div>
          </div>

          {booking.specialRequests && (
            <div className="confirmation__requests">
              <h3>Special Requests</h3>
              <p>{booking.specialRequests}</p>
            </div>
          )}

          {/* Demo notice */}
          <div className="confirmation__demo-notice">
            ⚠️ <strong>Demo Project Notice:</strong> This is a college project. No real payment was charged. 
            No actual hotel reservation has been made.
          </div>

          {/* Actions */}
          <div className="confirmation__actions">
            <Link to="/rooms" className="btn btn--outline btn--lg">Browse More Rooms</Link>
            <Link to="/my-booking" className="btn btn--primary btn--lg">Look Up My Booking</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
