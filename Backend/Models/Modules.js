import mongoose from 'mongoose';

const ModuleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 2,
            maxlength: 50
        },
        label: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 50
        },
        description: {
            type: String,
            default: '',
            maxlength: 500
        },
        status: {
            type: String,
            enum: ['Active', 'Suspended'],
            default: 'Active'
        },
        order: {
            type: Number,
            default: 0,
            min: 0
        },
        category: {
            type: String,
            default: 'General',
            enum: ['General', 'HR', 'IT', 'Finance', 'Operations']
        },
        icon: {
            type: String,
            default: 'extension'
        }
    },
    { timestamps: true }
);

// Note: timestamps: true automatically manages createdAt and updatedAt.
// Manual pre-save/update hooks for updatedAt are unnecessary and removed.

const Module = mongoose.models.Module || mongoose.model('Module', ModuleSchema);
export default Module;