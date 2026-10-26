const express = require('express');
const router = express.Router();
const { createBooking, getBookingByReference } = require('../controllers/bookingController');

// Public routes
router.post('/', createBooking);
router.get('/reference/:reference', getBookingByReference);

module.exports = router;
