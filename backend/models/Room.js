const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      enum: ['Standard', 'Deluxe', 'Suite', 'Presidential'],
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price cannot be negative'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    amenities: [{ type: String }],
    images: [{ type: String }],
    isAvailable: {
      type: Boolean,
      default: true,
    },
    roomNumber: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
