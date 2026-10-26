import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchRoomById } from '../api/rooms';
import { createBooking } from '../api/bookings';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function validate(form, room) {
  const errs = {};
  if (!form.guestName.trim() || form.guestName.trim().length < 2)
    errs.guestName = 'Name must be at least 2 characters.';
  if (!/^\S+@\S+\.\S+$/.test(form.guestEmail))
    errs.guestEmail = 'Enter a valid email address.';
  if (!form.checkIn) errs.checkIn = 'Check-in date is required.';
  if (!form.checkOut) errs.checkOut = 'Check-out date is required.';
  if (form.checkIn && form.checkOut && form.checkOut <= form.checkIn)
    errs.checkOut = 'Check-out must be after check-in.';
  if (!form.guests || form.guests < 1) errs.guests = 'At least 1 guest required.';
  if (room && form.guests > room.capacity)
    errs.guests = `Max capacity is ${room.capacity} guests.`;
  return errs;
}

export default function Booking() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState('');

  const [form, setForm] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: today(),
    checkOut: tomorrow(),
    guests: 1,
    specialRequests: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchRoomById(roomId)
      .then((data) => setRoom(data.data))
      .catch((err) => setRoomError(err.message))
      .finally(() => setLoadingRoom(false));
  }, [roomId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'guests' ? parseInt(value) || 1 : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, room);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await createBooking({ roomId, ...form });
      navigate('/confirmation', { state: { booking: res.data } });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRoom) return <div className="center-block" style={{ minHeight: '60vh' }}><Spinner size="lg" /></div>;
  if (roomError) return (
    <div className="container section">
      <Alert type="error" message={roomError} />
      <Link to="/rooms" className="btn btn--outline" style={{ marginTop: '1rem' }}>← Back</Link>
    </div>
  );

  const nights = calcNights(form.checkIn, form.checkOut);
  const total = nights * (room?.pricePerNight || 0);

  return (
    <div className="page-wrapper">
      <div className="page-hero page-hero--booking">
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <p className="section__eyebrow">Reservation</p>
          <h1>Complete Your Booking</h1>
          <p>Fill in your details below to secure your room.</p>
        </div>
      </div>

      <div className="container section">
        <div className="booking-layout">
          {/* Form */}
          <div className="booking-form-wrapper">
            <h2 className="booking-form__title">Guest Information</h2>
            <p className="booking-form__demo-notice">
              ⚠️ <strong>Demo Mode</strong> — No real payment will be charged.
            </p>

            {submitError && (
              <Alert type="error" message={submitError} onClose={() => setSubmitError('')} />
            )}

            <form className="booking-form" onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="guestName">Full Name *</label>
                  <input
                    id="guestName" name="guestName" type="text"
                    placeholder="John Smith" autoComplete="name"
                    value={form.guestName} onChange={handleChange}
                    className={errors.guestName ? 'input--error' : ''}
                  />
                  {errors.guestName && <span className="field-error">{errors.guestName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="guestEmail">Email Address *</label>
                  <input
                    id="guestEmail" name="guestEmail" type="email"
                    placeholder="john@example.com" autoComplete="email"
                    value={form.guestEmail} onChange={handleChange}
                    className={errors.guestEmail ? 'input--error' : ''}
                  />
                  {errors.guestEmail && <span className="field-error">{errors.guestEmail}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="guestPhone">Phone Number (optional)</label>
                <input
                  id="guestPhone" name="guestPhone" type="tel"
                  placeholder="+1 (555) 000-0000" autoComplete="tel"
                  value={form.guestPhone} onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="checkIn">Check-In Date *</label>
                  <input
                    id="checkIn" name="checkIn" type="date"
                    min={today()} value={form.checkIn} onChange={handleChange}
                    className={errors.checkIn ? 'input--error' : ''}
                  />
                  {errors.checkIn && <span className="field-error">{errors.checkIn}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="checkOut">Check-Out Date *</label>
                  <input
                    id="checkOut" name="checkOut" type="date"
                    min={form.checkIn || today()} value={form.checkOut} onChange={handleChange}
                    className={errors.checkOut ? 'input--error' : ''}
                  />
                  {errors.checkOut && <span className="field-error">{errors.checkOut}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="guests">Number of Guests *</label>
                <select
                  id="guests" name="guests" value={form.guests} onChange={handleChange}
                  className={errors.guests ? 'input--error' : ''}
                >
                  {Array.from({ length: room?.capacity || 1 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} Guest{i > 0 ? 's' : ''}</option>
                  ))}
                </select>
                {errors.guests && <span className="field-error">{errors.guests}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="specialRequests">Special Requests (optional)</label>
                <textarea
                  id="specialRequests" name="specialRequests" rows={3}
                  placeholder="Late check-in, extra pillows, dietary requirements…"
                  value={form.specialRequests} onChange={handleChange}
                />
              </div>

              <button
                type="submit" className="btn btn--primary btn--full btn--lg"
                disabled={submitting}
              >
                {submitting ? (
                  <><Spinner size="sm" /> Confirming Booking…</>
                ) : (
                  `Confirm Booking — $${total} (Demo)`
                )}
              </button>
            </form>
          </div>

          {/* Summary sidebar */}
          <aside className="booking-summary">
            <h3>Booking Summary</h3>
            {room && (
              <>
                <div className="booking-summary__room">
                  <strong>{room.name}</strong>
                  <span className="room-card__badge">{room.type}</span>
                </div>
                <div className="booking-summary__details">
                  <div><span>Room</span><span>No. {room.roomNumber}</span></div>
                  <div><span>Check-in</span><span>{form.checkIn || '—'}</span></div>
                  <div><span>Check-out</span><span>{form.checkOut || '—'}</span></div>
                  <div><span>Guests</span><span>{form.guests}</span></div>
                  <div><span>Nights</span><span>{nights}</span></div>
                  <div><span>Rate</span><span>${room.pricePerNight}/night</span></div>
                </div>
                <div className="booking-summary__total">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
                <p className="booking-summary__note">
                  💳 <strong>Demo Payment</strong><br />
                  This is a college project. No real payment is processed. Booking status will show as "Demo Paid".
                </p>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
