const Room = require('../models/Room');

// GET /api/rooms — list all available rooms, with optional type filter
const getRooms = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.available !== 'false') {
      filter.isAvailable = true;
    }

    const rooms = await Room.find(filter).sort({ pricePerNight: 1 });
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rooms', error: error.message });
  }
};

// GET /api/rooms/:id
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch room', error: error.message });
  }
};

// POST /api/admin/rooms — create room (admin only)
const createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to create room', error: error.message });
  }
};

// PUT /api/admin/rooms/:id — update room (admin only)
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update room', error: error.message });
  }
};

// DELETE /api/admin/rooms/:id
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete room', error: error.message });
  }
};

module.exports = { getRooms, getRoomById, createRoom, updateRoom, deleteRoom };
