import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  fetchDashboardStats,
  fetchAllBookings,
  updateBookingStatus,
  seedRooms,
} from '../api/admin';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'checked-in', 'checked-out'];

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!admin) { navigate('/admin/login', { replace: true }); return; }
    loadData();
  }, [admin, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, bookingsData] = await Promise.all([
        fetchDashboardStats(),
        fetchAllBookings(statusFilter ? { status: statusFilter } : {}),
      ]);
      setStats(statsData.data);
      setBookings(bookingsData.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus);
      setSuccess(`Booking status updated to "${newStatus}"`);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedRooms();
      setSuccess(res.message);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  if (!admin) return null;

  return (
    <div className="page-wrapper">
      <div className="admin-page">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header__left">
            <h1>Admin Dashboard</h1>
            <p>Welcome back, <strong>{admin.name}</strong></p>
          </div>
          <div className="admin-header__actions">
            <button
              className="btn btn--outline btn--sm"
              onClick={handleSeed}
              disabled={seeding}
              title="Seed sample rooms if none exist"
            >
              {seeding ? <Spinner size="sm" /> : '🌱 Seed Rooms'}
            </button>
            <button className="btn btn--danger btn--sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="container">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

          {/* Stats cards */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card stat-card--blue">
                <div className="stat-card__value">{stats.totalRooms}</div>
                <div className="stat-card__label">Total Rooms</div>
              </div>
              <div className="stat-card stat-card--purple">
                <div className="stat-card__value">{stats.totalBookings}</div>
                <div className="stat-card__label">Total Bookings</div>
              </div>
              <div className="stat-card stat-card--orange">
                <div className="stat-card__value">{stats.pendingBookings}</div>
                <div className="stat-card__label">Pending</div>
              </div>
              <div className="stat-card stat-card--green">
                <div className="stat-card__value">${stats.totalRevenue.toLocaleString()}</div>
                <div className="stat-card__label">Demo Revenue</div>
              </div>
            </div>
          )}

          {/* Bookings table */}
          <div className="admin-section">
            <div className="admin-section__header">
              <h2>Booking Requests</h2>
              <div className="admin-section__filters">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button className="btn btn--outline btn--sm" onClick={loadData}>
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="center-block" style={{ padding: '3rem 0' }}><Spinner size="lg" /></div>
            ) : bookings.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">📋</span>
                <h3>No bookings found</h3>
                <p>{statusFilter ? `No bookings with status "${statusFilter}".` : 'No bookings yet. Make a test booking from the frontend.'}</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Guests</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b._id}>
                        <td><code className="ref-code">{b.bookingReference}</code></td>
                        <td>
                          <div className="admin-table__guest">
                            <strong>{b.guestName}</strong>
                            <span>{b.guestEmail}</span>
                          </div>
                        </td>
                        <td>{b.room?.name}<br /><small>No. {b.room?.roomNumber}</small></td>
                        <td>{fmt(b.checkIn)}</td>
                        <td>{fmt(b.checkOut)}</td>
                        <td>{b.guests}</td>
                        <td><strong>${b.totalPrice}</strong></td>
                        <td>
                          <span className={`status-badge status-badge--${b.status}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {updatingId === b._id ? (
                            <Spinner size="sm" />
                          ) : (
                            <select
                              value={b.status}
                              onChange={(e) => handleStatusChange(b._id, e.target.value)}
                              className="status-select"
                              aria-label="Change booking status"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
