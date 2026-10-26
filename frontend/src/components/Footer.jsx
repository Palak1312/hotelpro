import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__brand">
          <span className="footer__logo">⬡ HotelPro</span>
          <p>Experience luxury redefined. Your perfect stay awaits at HotelPro.</p>
        </div>

        <div className="footer__links">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/rooms">Our Rooms</Link></li>
            <li><Link to="/my-booking">My Booking</Link></li>
            <li><Link to="/admin/login">Admin</Link></li>
          </ul>
        </div>

        <div className="footer__links">
          <h4>Room Types</h4>
          <ul>
            <li><Link to="/rooms?type=Standard">Standard</Link></li>
            <li><Link to="/rooms?type=Deluxe">Deluxe</Link></li>
            <li><Link to="/rooms?type=Suite">Suite</Link></li>
            <li><Link to="/rooms?type=Presidential">Presidential</Link></li>
          </ul>
        </div>

        <div className="footer__contact">
          <h4>Contact</h4>
          <p>📍 123 Luxury Avenue, Grand City</p>
          <p>📞 +1 (800) 468-5765</p>
          <p>✉️ hello@hotelpro.com</p>
          <p className="footer__demo-note">⚠️ Demo project — not a real hotel</p>
        </div>
      </div>

      <div className="footer__bottom">
        <p>© {new Date().getFullYear()} HotelPro. College Project Demo.</p>
      </div>
    </footer>
  );
}
