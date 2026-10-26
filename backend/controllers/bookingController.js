const Booking = require('../models/Booking');
const Room = require('../models/Room');

// POST /api/bookings — create a new booking
const createBooking = async (req, res) => {
  try {
    const { roomId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, specialRequests } = req.body;

    // Validate required fields
    if (!roomId || !guestName || !guestEmail || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return res.status(400).json({ success: false, message: 'Check-in date cannot be in the past' });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
    }

    // Find room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    if (!room.isAvailable) {
      return res.status(400).json({ success: false, message: 'Room is not available' });
    }
    if (guests > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `This room has a max capacity of ${room.capacity} guests`,
      });
    }

    // Check for conflicting bookings
    const conflict = await Booking.findOne({
      room: roomId,
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } },
      ],
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: 'Room is already booked for those dates' });
    }

    // Calculate total price
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * room.pricePerNight;

    const booking = await Booking.create({
      room: roomId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalPrice,
      specialRequests,
      status: 'confirmed', // auto-confirm for demo
      paymentStatus: 'demo_paid',
    });

    const populatedBooking = await booking.populate('room', 'name type roomNumber pricePerNight');

    res.status(201).json({ success: true, data: populatedBooking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Booking failed', error: error.message });
  }
};

// GET /api/bookings/:reference — get booking by reference
const getBookingByReference = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      bookingReference: req.params.reference.toUpperCase(),
    }).populate('room', 'name type roomNumber pricePerNight images');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found. Check your reference number.' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch booking', error: error.message });
  }
};

// GET /api/admin/bookings — all bookings (admin)
const getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('room', 'name type roomNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: error.message });
  }
};

// PATCH /api/admin/bookings/:id/status — update booking status (admin)
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'cancelled', 'checked-in', 'checked-out'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('room', 'name type roomNumber');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update booking', error: error.message });
  }
};

module.exports = { createBooking, getBookingByReference, getAllBookings, updateBookingStatus };
