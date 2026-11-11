// Backend/Models/SecuritySettings.js
// Singleton document holding the org-wide auth policy shown in AuthSettings.jsx.
// ipWhitelistEnabled has been removed along with the IP Whitelist feature.
import mongoose from "mongoose";

const securitySettingsSchema = new mongoose.Schema(
  {
    minPasswordLength: { type: Number, default: 8, min: 6, max: 24 },
    requireUppercase: { type: Boolean, default: true },
    requireLowercase: { type: Boolean, default: true },
    requireNumbers: { type: Boolean, default: true },
    requireSymbols: { type: Boolean, default: true },
    passwordExpiry: { type: String, default: "90" }, // "30" | "60" | "90" | "never"
    retryLimit: { type: String, default: "5" },
    lockoutDuration: { type: String, default: "30" },
    mfaEnabled: { type: Boolean, default: true },
    ssoEnabled: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Enforce a single settings document for the whole org.
securitySettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({});
  if (!doc) doc = await this.create({});
  return doc;
};

export default mongoose.model("SecuritySettings", securitySettingsSchema);