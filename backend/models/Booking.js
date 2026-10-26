const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
    },
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    guestEmail: {
      type: String,
      required: [true, 'Guest email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    guestPhone: {
      type: String,
      trim: true,
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },
    guests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Must have at least 1 guest'],
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'checked-in', 'checked-out'],
      default: 'pending',
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    bookingReference: {
      type: String,
      unique: true,
    },
    paymentStatus: {
      type: String,
      enum: ['demo_pending', 'demo_paid'],
      default: 'demo_pending',
    },
  },
  { timestamps: true }
);

// Generate a unique booking reference before saving
bookingSchema.pre('save', async function (next) {
  if (!this.bookingReference) {
    const ref = 'HP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
    this.bookingReference = ref;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
