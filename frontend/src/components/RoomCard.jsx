import React from 'react';
import { Link } from 'react-router-dom';

const ROOM_GRADIENTS = {
  Standard:     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Deluxe:       'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  Suite:        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  Presidential: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
};

const ROOM_ICONS = {
  Standard: '🛏️',
  Deluxe: '🌿',
  Suite: '🌊',
  Presidential: '👑',
};

export default function RoomCard({ room }) {
  const gradient = ROOM_GRADIENTS[room.type] || ROOM_GRADIENTS.Standard;
  const icon = ROOM_ICONS[room.type] || '🏨';

  return (
    <article className="room-card">
      <div className="room-card__image" style={{ background: gradient }}>
        <span className="room-card__icon">{icon}</span>
        <span className={`room-card__badge room-card__badge--${room.type.toLowerCase()}`}>
          {room.type}
        </span>
      </div>

      <div className="room-card__body">
        <div className="room-card__header">
          <h3 className="room-card__name">{room.name}</h3>
          <p className="room-card__room-no">Room {room.roomNumber}</p>
        </div>

        <p className="room-card__desc">{room.description.slice(0, 100)}…</p>

        <ul className="room-card__amenities">
          {room.amenities.slice(0, 4).map((a) => (
            <li key={a}>{a}</li>
          ))}
          {room.amenities.length > 4 && <li>+{room.amenities.length - 4} more</li>}
        </ul>

        <div className="room-card__footer">
          <div className="room-card__meta">
            <span className="room-card__capacity">👥 Up to {room.capacity} guests</span>
            <div className="room-card__price">
              <span className="room-card__price-amount">${room.pricePerNight}</span>
              <span className="room-card__price-unit"> / night</span>
            </div>
          </div>
          <div className="room-card__actions">
            <Link to={`/rooms/${room._id}`} className="btn btn--outline btn--sm">
              Details
            </Link>
            <Link to={`/booking/${room._id}`} className="btn btn--primary btn--sm">
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
