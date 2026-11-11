// Backend/Models/Role.js
import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true, 
        minlength: 2, 
        maxlength: 50 
    },
    description: { 
        type: String, 
        trim: true, 
        maxlength: 500, 
        default: '' 
    },
    permissions: [{ 
        type: String, 
        trim: true 
    }],
    isDefault: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

// Index for quickly finding the default role
RoleSchema.index({ isDefault: 1 });

// Pre-save middleware to ensure only one default role exists
RoleSchema.pre('save', async function() {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { _id: { $ne: this._id }, isDefault: true },
            { $set: { isDefault: false } }
        );
    }
});

const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
export default Role;