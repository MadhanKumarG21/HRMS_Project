import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminName: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    module: { type: String, default: 'System' },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Index for querying audit logs by time (most recent first)
AuditLogSchema.index({ timestamp: -1 });
// Index for filtering by action type
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
// Index for looking up logs by admin user
AuditLogSchema.index({ adminId: 1 });
// Compound index for admin + time queries
AuditLogSchema.index({ adminId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;