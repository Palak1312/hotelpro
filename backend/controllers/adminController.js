const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Room = require('../models/Room');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/admin/login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(admin._id);
    res.json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// GET /api/admin/dashboard — stats
const getDashboardStats = async (req, res) => {
  try {
    const [totalRooms, totalBookings, pendingBookings, confirmedBookings, revenueResult] =
      await Promise.all([
        Room.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'pending' }),
        Booking.countDocuments({ status: 'confirmed' }),
        Booking.aggregate([
          { $match: { status: { $in: ['confirmed', 'checked-in', 'checked-out'] } } },
          { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]),
      ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({
      success: true,
      data: { totalRooms, totalBookings, pendingBookings, confirmedBookings, totalRevenue },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
};

// POST /api/admin/seed — seed sample rooms (dev/demo only)
const seedRooms = async (req, res) => {
  try {
    const existing = await Room.countDocuments();
    if (existing > 0) {
      return res.json({ success: true, message: `Already have ${existing} rooms. Skipping seed.` });
    }

    const rooms = [
      {
        roomNumber: '101',
        name: 'Classic Standard Room',
        type: 'Standard',
        pricePerNight: 89,
        capacity: 2,
        description: 'A comfortable and cozy room with all modern amenities. Perfect for budget-conscious travelers who want quality without compromise.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Flat-screen TV', 'Mini Fridge', 'Work Desk'],
        images: [],
        isAvailable: true,
      },
      {
        roomNumber: '201',
        name: 'Garden View Deluxe',
        type: 'Deluxe',
        pricePerNight: 149,
        capacity: 2,
        description: 'Spacious deluxe room with a serene garden view. Features premium furnishings, a king-size bed, and an elegant bathroom.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Bathtub', 'Room Service', 'Garden View'],
        images: [],
        isAvailable: true,
      },
      {
        roomNumber: '202',
        name: 'Ocean View Deluxe',
        type: 'Deluxe',
        pricePerNight: 179,
        capacity: 3,
        description: 'Stunning ocean-facing deluxe room with breathtaking views. Enjoy the sound of waves from your private balcony.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Mini Bar', 'Balcony', 'Ocean View', 'Room Service'],
        images: [],
        isAvailable: true,
      },
      {
        roomNumber: '301',
        name: 'Executive Suite',
        type: 'Suite',
        pricePerNight: 299,
        capacity: 4,
        description: 'An expansive suite combining luxury and functionality. Includes a separate living area, kitchenette, and a spa-inspired bathroom.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', '65" Smart TV', 'Full Kitchen', 'Jacuzzi', 'Living Room', 'Concierge', 'Room Service', 'City View'],
        images: [],
        isAvailable: true,
      },
      {
        roomNumber: '302',
        name: 'Honeymoon Suite',
        type: 'Suite',
        pricePerNight: 349,
        capacity: 2,
        description: 'A romantic retreat designed for couples. Features a four-poster bed, private balcony, and a luxurious couples spa bath.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Jacuzzi', 'Private Balcony', 'Champagne on Arrival', 'Couples Spa', 'Ocean View'],
        images: [],
        isAvailable: true,
      },
      {
        roomNumber: '401',
        name: 'Presidential Suite',
        type: 'Presidential',
        pricePerNight: 599,
        capacity: 6,
        description: 'The pinnacle of luxury. Two floors of pure opulence with a private terrace, personal butler, full kitchen, and panoramic city views.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Home Theatre', 'Full Kitchen', 'Private Terrace', 'Personal Butler', 'Jacuzzi', 'Dining Room', 'Panoramic View', 'Limousine Transfer'],
        images: [],
        isAvailable: true,
      },
    ];

    await Room.insertMany(rooms);
    res.json({ success: true, message: `Seeded ${rooms.length} rooms successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Seed failed', error: error.message });
  }
};

module.exports = { loginAdmin, getDashboardStats, seedRooms };
