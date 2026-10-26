import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRooms } from '../api/rooms';
import RoomCard from '../components/RoomCard';
import Spinner from '../components/Spinner';

const FEATURES = [
  { icon: '🌟', title: 'Luxury Rooms', desc: 'Handcrafted interiors with premium materials and breathtaking views.' },
  { icon: '🍽️', title: 'Fine Dining', desc: 'World-class cuisine prepared by award-winning chefs, served in elegant settings.' },
  { icon: '🏊', title: 'Spa & Wellness', desc: 'Rejuvenate your mind and body with our full-service spa and pool facilities.' },
  { icon: '🤝', title: '24/7 Concierge', desc: 'Our dedicated team is available around the clock to fulfill your every request.' },
];

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Travel Blogger', text: 'Absolutely breathtaking experience. The Presidential Suite was beyond words. HotelPro is where dreams meet reality.', rating: 5 },
  { name: 'James K.', role: 'Business Traveler', text: 'Perfect for business stays. Fast Wi-Fi, seamless booking, and the concierge team handled everything flawlessly.', rating: 5 },
  { name: 'Priya R.', role: 'Honeymooner', text: 'The Honeymoon Suite was magical. Every detail was perfect — champagne, jacuzzi, the ocean view… unforgettable!', rating: 5 },
];

export default function Home() {
  const [featuredRooms, setFeaturedRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    fetchRooms()
      .then((data) => setFeaturedRooms(data.data.slice(0, 3)))
      .catch(() => setFeaturedRooms([]))
      .finally(() => setLoadingRooms(false));
  }, []);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__overlay" />
        <div className="hero__content">
          <p className="hero__eyebrow">Welcome to HotelPro</p>
          <h1 className="hero__title">Experience Luxury<br />Like Never Before</h1>
          <p className="hero__subtitle">
            Indulge in world-class comfort with stunning views, premium amenities,
            and personalised service that redefines hospitality.
          </p>
          <div className="hero__actions">
            <Link to="/rooms" className="btn btn--primary btn--lg">Explore Rooms</Link>
            <Link to="/my-booking" className="btn btn--ghost btn--lg">Check My Booking</Link>
          </div>
        </div>
        <div className="hero__stats">
          <div className="hero__stat"><span>6</span><p>Room Types</p></div>
          <div className="hero__stat"><span>500+</span><p>Happy Guests</p></div>
          <div className="hero__stat"><span>4.9★</span><p>Rating</p></div>
          <div className="hero__stat"><span>24/7</span><p>Support</p></div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="section features">
        <div className="container">
          <div className="section__header">
            <p className="section__eyebrow">Why Choose Us</p>
            <h2 className="section__title">An Unforgettable Experience</h2>
            <p className="section__subtitle">From the moment you arrive to the moment you leave, every detail is designed for you.</p>
          </div>
          <div className="features__grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-card__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Rooms ────────────────────────────────────── */}
      <section className="section section--alt featured-rooms">
        <div className="container">
          <div className="section__header">
            <p className="section__eyebrow">Accommodation</p>
            <h2 className="section__title">Our Signature Rooms</h2>
            <p className="section__subtitle">Each room is a masterpiece of design and comfort. Choose your perfect retreat.</p>
          </div>

          {loadingRooms ? (
            <div className="center-block"><Spinner size="lg" /></div>
          ) : featuredRooms.length === 0 ? (
            <div className="empty-state">
              <p>Rooms not loaded yet. <Link to="/rooms">Browse all rooms →</Link></p>
            </div>
          ) : (
            <div className="rooms__grid">
              {featuredRooms.map((room) => (
                <RoomCard key={room._id} room={room} />
              ))}
            </div>
          )}

          <div className="center-block" style={{ marginTop: '2.5rem' }}>
            <Link to="/rooms" className="btn btn--primary btn--lg">View All Rooms</Link>
          </div>
        </div>
      </section>

      {/* ── Booking CTA ──────────────────────────────────────── */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-box">
            <div className="cta-box__content">
              <h2>Ready for Your Dream Stay?</h2>
              <p>Book directly for the best rates and complimentary amenities. No hidden fees, no surprises.</p>
            </div>
            <div className="cta-box__actions">
              <Link to="/rooms" className="btn btn--white btn--lg">Book Your Room</Link>
              <Link to="/my-booking" className="btn btn--ghost-white btn--lg">Find My Booking</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="section testimonials">
        <div className="container">
          <div className="section__header">
            <p className="section__eyebrow">Guest Reviews</p>
            <h2 className="section__title">What Our Guests Say</h2>
          </div>
          <div className="testimonials__grid">
            {TESTIMONIALS.map((t) => (
              <div className="testimonial-card" key={t.name}>
                <div className="testimonial-card__stars">{'★'.repeat(t.rating)}</div>
                <p className="testimonial-card__text">"{t.text}"</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
