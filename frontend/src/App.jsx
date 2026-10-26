import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import PageLoader from './components/PageLoader';
import { AdminAuthProvider } from './context/AdminAuthContext';

const Home        = lazy(() => import('./pages/Home'));
const Rooms       = lazy(() => import('./pages/Rooms'));
const RoomDetail  = lazy(() => import('./pages/RoomDetail'));
const Booking     = lazy(() => import('./pages/Booking'));
const Confirmation = lazy(() => import('./pages/Confirmation'));
const BookingLookup = lazy(() => import('./pages/BookingLookup'));
const AdminLogin  = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound    = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <AdminAuthProvider>
      <ScrollToTop />
      <div className="app-wrapper">
        <Navbar />
        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"                  element={<Home />} />
              <Route path="/rooms"             element={<Rooms />} />
              <Route path="/rooms/:id"         element={<RoomDetail />} />
              <Route path="/booking/:roomId"   element={<Booking />} />
              <Route path="/confirmation"      element={<Confirmation />} />
              <Route path="/my-booking"        element={<BookingLookup />} />
              <Route path="/admin/login"       element={<AdminLogin />} />
              <Route path="/admin/dashboard"   element={<AdminDashboard />} />
              <Route path="/404"               element={<NotFound />} />
              <Route path="*"                  element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </AdminAuthProvider>
  );
}

export default App;
