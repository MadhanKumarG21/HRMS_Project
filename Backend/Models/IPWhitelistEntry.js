// Backend/Models/IPWhitelistEntry.js
import mongoose from "mongoose";

// Accepts IPv4, IPv6, and simple CIDR notation (e.g. 192.168.1.0/24)
const IP_OR_CIDR_REGEX =
  /^(([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?|([a-fA-F0-9:]+:+)+[a-fA-F0-9]+(\/\d{1,3})?)$/;

const ipWhitelistSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (v) => IP_OR_CIDR_REGEX.test(v),
        message: (props) => `${props.value} is not a valid IP address or CIDR range`,
      },
    },
    label: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    expiresAt: {
      type: Date,
      default: null, // null = never expires
    },
  },
  { timestamps: true },
);

ipWhitelistSchema.virtual("isExpired").get(function () {
  return Boolean(this.expiresAt && this.expiresAt.getTime() < Date.now());
});

export default mongoose.model("IPWhitelistEntry", ipWhitelistSchema);