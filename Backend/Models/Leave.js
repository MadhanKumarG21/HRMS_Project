import mongoose from 'mongoose';

const LeaveSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        enum: ['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other'],
        required: true 
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending' 
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String }
}, { timestamps: true });

// Indexes for common leave queries
LeaveSchema.index({ userId: 1 });
LeaveSchema.index({ status: 1 });
LeaveSchema.index({ status: 1, createdAt: -1 });
// Compound index for user leave history with status filtering
LeaveSchema.index({ userId: 1, status: 1 });
// Index for date range queries (overlapping leave periods)
LeaveSchema.index({ fromDate: 1, toDate: 1 });

const Leave = mongoose.models.Leave || mongoose.model('Leave', LeaveSchema);
export default Leave;