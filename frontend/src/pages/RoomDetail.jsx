import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchRoomById } from '../api/rooms';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

const ROOM_GRADIENTS = {
  Standard:     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Deluxe:       'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  Suite:        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  Presidential: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
};

export default function RoomDetail() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchRoomById(id)
      .then((data) => setRoom(data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="center-block" style={{ minHeight: '60vh' }}><Spinner size="lg" /></div>;
  if (error) return (
    <div className="container section">
      <Alert type="error" message={error} />
      <Link to="/rooms" className="btn btn--outline" style={{ marginTop: '1rem' }}>← Back to Rooms</Link>
    </div>
  );
  if (!room) return null;

  const gradient = ROOM_GRADIENTS[room.type] || ROOM_GRADIENTS.Standard;

  return (
    <div className="page-wrapper">
      <div className="room-detail">
        {/* Hero banner */}
        <div className="room-detail__banner" style={{ background: gradient }}>
          <div className="room-detail__banner-overlay" />
          <div className="room-detail__banner-content">
            <Link to="/rooms" className="back-link">← All Rooms</Link>
            <span className="room-card__badge">{room.type}</span>
            <h1>{room.name}</h1>
            <p>Room {room.roomNumber} · Up to {room.capacity} guests</p>
          </div>
        </div>

        <div className="container">
          <div className="room-detail__layout">
            {/* Main info */}
            <div className="room-detail__main">
              <section className="room-detail__section">
                <h2>About This Room</h2>
                <p>{room.description}</p>
              </section>

              <section className="room-detail__section">
                <h2>Amenities</h2>
                <ul className="amenities-list">
                  {room.amenities.map((a) => (
                    <li key={a}><span>✓</span>{a}</li>
                  ))}
                </ul>
              </section>

              <section className="room-detail__section">
                <h2>Policies</h2>
                <ul className="policy-list">
                  <li>📅 Check-in: 3:00 PM | Check-out: 11:00 AM</li>
                  <li>🚭 Non-smoking room</li>
                  <li>🐾 Pets not allowed</li>
                  <li>💳 Demo payment — no real charge</li>
                  <li>🔄 Free cancellation (demo)</li>
                </ul>
              </section>
            </div>

            {/* Booking card */}
            <aside className="room-detail__sidebar">
              <div className="booking-card">
                <div className="booking-card__price">
                  <span className="booking-card__amount">${room.pricePerNight}</span>
                  <span className="booking-card__unit">/ night</span>
                </div>
                <div className="booking-card__meta">
                  <div><span>Type</span><strong>{room.type}</strong></div>
                  <div><span>Capacity</span><strong>Up to {room.capacity} guests</strong></div>
                  <div><span>Room No.</span><strong>{room.roomNumber}</strong></div>
                  <div><span>Availability</span>
                    <strong className={room.isAvailable ? 'text-success' : 'text-error'}>
                      {room.isAvailable ? '✓ Available' : '✗ Unavailable'}
                    </strong>
                  </div>
                </div>
                {room.isAvailable ? (
                  <Link to={`/booking/${room._id}`} className="btn btn--primary btn--full">
                    Reserve This Room
                  </Link>
                ) : (
                  <button className="btn btn--disabled btn--full" disabled>
                    Not Available
                  </button>
                )}
                <p className="booking-card__note">⚠️ Demo project — no real payment</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
