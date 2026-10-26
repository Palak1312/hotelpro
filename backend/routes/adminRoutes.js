const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { loginAdmin, getDashboardStats, seedRooms } = require('../controllers/adminController');
const { getAllBookings, updateBookingStatus } = require('../controllers/bookingController');
const { createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');

// Public admin routes
router.post('/login', loginAdmin);

// Seed route — only works if no rooms exist (safe to leave in for demo)
router.post('/seed', seedRooms);

// Protected admin routes
router.get('/dashboard', protect, getDashboardStats);
router.get('/bookings', protect, getAllBookings);
router.patch('/bookings/:id/status', protect, updateBookingStatus);
router.post('/rooms', protect, createRoom);
router.put('/rooms/:id', protect, updateRoom);
router.delete('/rooms/:id', protect, deleteRoom);

module.exports = router;
