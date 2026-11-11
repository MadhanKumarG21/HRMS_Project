// Backend/Models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  // Now properly typed as Date (was String) — self check-in/check-out needs
  // real timestamps to compute working hours accurately. Existing records
  // saved as strings before this change remain readable (Mongoose casts
  // them on read), but every new record stores a real Date going forward.
  checkIn: {
    type: Date,
  },
  checkOut: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Half Day', 'Holiday', 'Leave'],
    required: true,
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  lateMinutes: {
    type: Number,
    default: 0,
    min: 0,
  },
  workingHours: {
    type: Number,
    default: 0,
  },
  overtimeStartedAt: {
    type: Date,
    default: null,
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  autoCheckoutNotifiedAt: {
    type: Date,
    default: null,
  },
  autoCheckedOut: {
    type: Boolean,
    default: false,
  },
  // Free-text note — e.g. "Auto checked-out at 5:00 PM (no response to reminder)".
  // Also usable by admins for manual entries.
  notes: {
    type: String,
    default: '',
  },

  // Soft delete field
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for soft delete queries
attendanceSchema.index({ userId: 1, date: 1, deletedAt: 1 });

// Query middleware to exclude soft-deleted records by default.
// Mongoose 7+ query hooks are async-only — no `next` callback exists.
attendanceSchema.pre(/^find/, function () {
  if (this._conditions && !this._conditions.includeDeleted) {
    this.where({ deletedAt: null });
  }
});

export default mongoose.model('Attendance', attendanceSchema);