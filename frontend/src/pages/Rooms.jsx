import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchRooms } from '../api/rooms';
import RoomCard from '../components/RoomCard';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

const TYPES = ['All', 'Standard', 'Deluxe', 'Suite', 'Presidential'];

export default function Rooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'All';

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeType, setActiveType] = useState(initialType);

  const loadRooms = (type) => {
    setLoading(true);
    setError('');
    fetchRooms(type === 'All' ? '' : type)
      .then((data) => setRooms(data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRooms(activeType); }, [activeType]);

  const handleTypeChange = (type) => {
    setActiveType(type);
    if (type === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ type });
    }
  };

  return (
    <div className="page-wrapper">
      {/* Page header */}
      <div className="page-hero page-hero--rooms">
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <p className="section__eyebrow">Our Collection</p>
          <h1>Find Your Perfect Room</h1>
          <p>From cozy standard rooms to opulent presidential suites — there's a room for every stay.</p>
        </div>
      </div>

      <div className="container section">
        {/* Filter bar */}
        <div className="filter-bar">
          <p className="filter-bar__label">Filter by type:</p>
          <div className="filter-bar__buttons">
            {TYPES.map((t) => (
              <button
                key={t}
                className={`filter-btn ${activeType === t ? 'filter-btn--active' : ''}`}
                onClick={() => handleTypeChange(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {loading ? (
          <div className="center-block" style={{ padding: '4rem 0' }}>
            <Spinner size="lg" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">🏨</span>
            <h3>No rooms found</h3>
            <p>Try a different filter or check back later.</p>
            <button className="btn btn--primary" onClick={() => handleTypeChange('All')}>
              Show All Rooms
            </button>
          </div>
        ) : (
          <>
            <p className="rooms__count">{rooms.length} room{rooms.length !== 1 ? 's' : ''} available</p>
            <div className="rooms__grid">
              {rooms.map((room) => (
                <RoomCard key={room._id} room={room} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
