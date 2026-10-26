import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page-wrapper">
      <div className="not-found">
        <div className="not-found__content">
          <span className="not-found__code">404</span>
          <h1>Page Not Found</h1>
          <p>The page you're looking for doesn't exist or has been moved.</p>
          <div className="not-found__actions">
            <Link to="/" className="btn btn--primary btn--lg">Go to Homepage</Link>
            <Link to="/rooms" className="btn btn--outline btn--lg">Browse Rooms</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
