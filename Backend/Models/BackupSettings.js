import mongoose from 'mongoose';

const BackupSettingsSchema = new mongoose.Schema({
    autoBackup: { type: Boolean, default: true },
    backupFrequency: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'], default: 'daily' },
    backupTime: { type: String, default: '02:00' },
    retentionDays: { type: Number, default: 30 },
    backupLocation: { type: String, enum: ['local', 'cloud', 'external', 'remote'], default: 'local' },
    lastBackup: { type: Date },
    lastBackupSize: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const BackupSettings = mongoose.models.BackupSettings || mongoose.model('BackupSettings', BackupSettingsSchema);
export default BackupSettings;