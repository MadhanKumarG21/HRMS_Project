// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // --- 1. Authentication & System Identity ---
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true }, // e.g., 'Admin', 'Employee', 'HR'
    permissions: { type: [{ type: String }], default: [] },
    status: { 
      type: String, 
      enum: ["Active", "Inactive", "On Leave", "Terminated"], 
      default: "Active" 
    },
    lastLogin: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: Date.now },
    passwordHistory: [
      { hash: String, changedAt: { type: Date, default: Date.now } },
    ],
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    twoFactorTempSecret: { type: String, select: false },
    twoFactorBackupCodes: { type: [String], select: false, default: [] },
    activeSessions: [
      {
        token: String,
        device: String,
        ip: String,
        userAgent: String,
        lastActive: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // --- 2. Professional & HR Info ---
    employeeId: { type: String, unique: true },
    department: { type: String, required: true },
    designation: { type: String, default: "" },
    joiningDate: { type: Date, default: Date.now },

    // --- 3. Personal Info ---
    profileImage: { type: String, default: "" },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    emergencyContact: { type: String, default: "" },

    // --- 4. Payroll / Bank details ---
    bankDetails: {
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      bankName: { type: String, default: "" }
    },

    // --- 5. HR Documents ---
    documents: [{
      name: { type: String },
      url: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true },
);

UserSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Auto-generate employeeId sequence: EMP-00001, EMP-00002, etc.
UserSchema.pre("save", async function () {
  if (this.isNew && !this.employeeId) {
    try {
      const lastUser = await mongoose.model("User").findOne(
        { employeeId: /^EMP-\d+$/ },
        { employeeId: 1 },
        { sort: { employeeId: -1 } }
      );
      
      let nextNum = 1;
      if (lastUser && lastUser.employeeId) {
        const match = lastUser.employeeId.match(/^EMP-(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      this.employeeId = `EMP-${String(nextNum).padStart(5, "0")}`;
    } catch (err) {
      throw err;
    }
  }
});

// Indexes for common queries
UserSchema.index({ department: 1 });
UserSchema.index({ status: 1 });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
