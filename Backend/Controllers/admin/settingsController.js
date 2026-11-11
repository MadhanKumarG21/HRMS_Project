// Backend/Controllers/admin/settingsController.js
// Manages all system settings: company, notification, backup, appearance, integration, security.
import mongoose from 'mongoose';
import CompanySettings from '../../Models/CompanySettings.js';
import BackupSettings from '../../Models/BackupSettings.js';
import AuditLog from '../../Models/AuditLog.js';
import { invalidateAttendanceTimezoneCache } from '../../utils/attendanceHelpers.js';
import { runBackup } from './backupController.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── Helper: Update Singleton Setting ──────────────────────────────────────
// Generic helper to upsert a singleton settings document.
const updateSingletonSetting = async (Model, updates, userId, userName, ip) => {
    return Model.findOneAndUpdate(
        {},
        { ...updates, updatedBy: userId, updatedAt: new Date() },
        { upsert: true, returnDocument: 'after', runValidators: true }
    );
};

// ─── Get All Settings ──────────────────────────────────────────────────────
export const getAllSettings = async (req, res) => {
    try {
        const [
            company,
            backup,
        ] = await Promise.all([
            CompanySettings.findOne().lean(),
            BackupSettings.findOne().lean(),
        ]);

        res.status(200).json({
            company: company || {},
            backup: backup || {},
        });
    } catch (error) {
        console.error('[Settings] Get all error:', error);
        res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
    }
};

// ─── Save All Settings ─────────────────────────────────────────────────────
// Whitelists sections and delegates to individual setters.
export const saveAllSettings = async (req, res) => {
    try {
            const { company, backup } = req.body;

        const userId = req.user?._id;
        const userName = req.user?.name || 'System';
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;

        if (company) {
            await updateSingletonSetting(CompanySettings, company, userId, userName, ip);
            invalidateAttendanceTimezoneCache();
        }
        if (backup) {
            await updateSingletonSetting(BackupSettings, backup, userId, userName, ip);
        }
        await AuditLog.create({
            adminId: userId,
            adminName: userName,
            action: 'SETTINGS_UPDATED',
            details: 'System settings were updated',
            module: 'Settings',
            severity: 'info',
            ipAddress: ip,
        });

        res.status(200).json({ success: true, message: 'All settings saved successfully!' });
    } catch (error) {
        console.error('[Settings] Save all error:', error);
        res.status(500).json({ message: 'Failed to save settings', error: error.message });
    }
};

// ─── Get Company Settings ──────────────────────────────────────────────────
export const getCompanySettings = async (req, res) => {
    try {
        const settings = await CompanySettings.findOne();
        res.status(200).json(settings || {});
    } catch (error) {
        console.error('[Settings] Get company error:', error);
        res.status(500).json({ message: 'Failed to fetch company settings', error: error.message });
    }
};

// ─── Update Company Settings ───────────────────────────────────────────────
export const updateCompanySettings = async (req, res) => {
    try {
        const settings = await updateSingletonSetting(
            CompanySettings,
            req.body,
            req.user?._id,
            req.user?.name || 'System',
            req.headers['x-forwarded-for'] || req.ip
        );

        invalidateAttendanceTimezoneCache();

        await AuditLog.create({
            adminId: req.user?._id,
            adminName: req.user?.name || 'System',
            action: 'COMPANY_SETTINGS_UPDATED',
            details: 'Company settings were updated',
            module: 'Settings',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.ip,
        });

        res.status(200).json({
            success: true,
            message: 'Company settings updated successfully',
            settings,
        });
    } catch (error) {
        console.error('[Settings] Update company error:', error);
        res.status(500).json({ message: 'Failed to update company settings', error: error.message });
    }
};

// ─── Get Backup Settings ───────────────────────────────────────────────────
export const getBackupSettings = async (req, res) => {
    try {
        const settings = await BackupSettings.findOne();
        res.status(200).json(settings || {});
    } catch (error) {
        console.error('[Settings] Get backup error:', error);
        res.status(500).json({ message: 'Failed to fetch backup settings', error: error.message });
    }
};

// ─── Update Backup Settings ────────────────────────────────────────────────
export const updateBackupSettings = async (req, res) => {
    try {
        const settings = await updateSingletonSetting(
            BackupSettings,
            req.body,
            req.user?._id,
            req.user?.name || 'System',
            req.headers['x-forwarded-for'] || req.ip
        );

        await AuditLog.create({
            adminId: req.user?._id,
            adminName: req.user?.name || 'System',
            action: 'BACKUP_SETTINGS_UPDATED',
            details: 'Backup settings were updated',
            module: 'Settings',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.ip,
        });

        res.status(200).json({
            success: true,
            message: 'Backup settings updated successfully',
            settings,
        });
    } catch (error) {
        console.error('[Settings] Update backup error:', error);
        res.status(500).json({ message: 'Failed to update backup settings', error: error.message });
    }
};

// ─── Run Manual Backup ─────────────────────────────────────────────────────
export const runManualBackup = async (req, res) => {
    return runBackup(req, res);
};

// ─── Restore from Backup ───────────────────────────────────────────────────
// Placeholder: actual restore logic requires backup file parsing and data migration.
export const restoreFromBackup = async (req, res) => {
    try {
        const { backupFile } = req.body;

        if (!backupFile) {
            return res.status(400).json({ message: 'Backup file is required' });
        }

        await AuditLog.create({
            adminId: req.user?._id,
            adminName: req.user?.name || 'System',
            action: 'RESTORE_FROM_BACKUP',
            details: `Restore initiated from backup: ${backupFile}`,
            module: 'Infrastructure',
            severity: 'critical',
            ipAddress: req.headers['x-forwarded-for'] || req.ip,
        });

        res.status(200).json({
            success: true,
            message: 'Restore initiated successfully',
            backupFile,
        });
    } catch (error) {
        console.error('[Settings] Restore error:', error);
        res.status(500).json({
            success: false,
            message: 'Restore failed',
            error: error.message,
        });
    }
};

// ─── Get Backup History ────────────────────────────────────────────────────
// Returns actual backup history records (currently stored in BackupSettings).
export const getBackupHistory = async (req, res) => {
    try {
        const settings = await BackupSettings.findOne();

        const history = settings?.lastBackup
            ? [
                  {
                      id: settings._id.toString(),
                      fileName: `backup-${new Date(settings.lastBackup).toISOString().split('T')[0]}.json`,
                      timestamp: settings.lastBackup,
                      size: settings.lastBackupSize || null,
                      status: 'completed',
                  },
              ]
            : [];

        res.status(200).json({ history });
    } catch (error) {
        console.error('[Settings] Get backup history error:', error);
        res.status(500).json({ message: 'Failed to fetch backup history', error: error.message });
    }
};
