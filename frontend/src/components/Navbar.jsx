import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => setMenuOpen(false), [location]);

  const navClass = `navbar ${(scrolled || !isHome) ? 'navbar--solid' : 'navbar--transparent'}`;

  return (
    <nav className={navClass}>
      <div className="navbar__container">
        <Link to="/" className="navbar__brand">
          <span className="navbar__logo-icon">⬡</span>
          <span className="navbar__brand-text">HotelPro</span>
        </Link>

        <button
          className={`navbar__burger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>

        <ul className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          <li><NavLink to="/" end>Home</NavLink></li>
          <li><NavLink to="/rooms">Rooms</NavLink></li>
          <li><NavLink to="/my-booking">My Booking</NavLink></li>
          {admin ? (
            <>
              <li><NavLink to="/admin/dashboard">Dashboard</NavLink></li>
              <li>
                <button className="navbar__logout-btn" onClick={logout}>
                  Logout
                </button>
              </li>
            </>
          ) : (
            <li><NavLink to="/admin/login" className="navbar__admin-link">Admin</NavLink></li>
          )}
          <li>
            <Link to="/rooms" className="btn btn--primary btn--sm navbar__cta">
              Book Now
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
