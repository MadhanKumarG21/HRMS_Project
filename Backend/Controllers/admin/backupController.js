// Backend/Controllers/admin/backupController.js
// Manages database backups: creation, retention, and backup settings.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../../Models/User.js';
import Role from '../../Models/Role.js';
import AuditLog from '../../Models/AuditLog.js';
import Module from '../../Models/Modules.js';
import Leave from '../../Models/Leave.js';
import Attendance from '../../Models/Attendance.js';
import BackupSettings from '../../Models/BackupSettings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backups directory — add this folder to .gitignore.
const BACKUP_DIR = path.join(__dirname, '../../backups');

// ─── Helper: Format Bytes ──────────────────────────────────────────────────
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

// ─── Helper: Cleanup Old Backups ───────────────────────────────────────────
const cleanupOldBackups = async (retentionDays) => {
    try {
        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        const files = await fs.readdir(BACKUP_DIR);

        for (const file of files) {
            const filePath = path.join(BACKUP_DIR, file);
            try {
                const stat = await fs.stat(filePath);
                if (stat.mtimeMs < cutoff) {
                    await fs.unlink(filePath);
                }
            } catch (err) {
                console.error(`[Backup] Failed to process file ${file}:`, err.message);
            }
        }
    } catch (error) {
        console.error('[Backup] Cleanup failed:', error.message);
    }
};

// ─── Run Backup ────────────────────────────────────────────────────────────
export const runBackup = async (req, res) => {
    try {
        const [users, roles, auditLogs, modules, leaves, attendance, settings] =
            await Promise.all([
                User.find().select('-password').lean(),
                Role.find().lean(),
                AuditLog.find().lean(),
                Module.find().lean(),
                Leave.find().lean(),
                Attendance.find().lean(),
                BackupSettings.findOne(),
            ]);

        const backupPayload = {
            createdAt: new Date(),
            collections: {
                users,
                roles,
                auditlogs: auditLogs,
                modules,
                leaves,
                attendance,
            },
        };

        // Ensure backup directory exists
        await fs.mkdir(BACKUP_DIR, { recursive: true });

        const fileName = `hrms-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(BACKUP_DIR, fileName);
        await fs.writeFile(filePath, JSON.stringify(backupPayload, null, 2));

        const { size } = await fs.stat(filePath);
        const sizeFormatted = formatBytes(size);

        const retentionDays = settings?.retentionDays ?? 30;
        await cleanupOldBackups(retentionDays);

        await BackupSettings.findOneAndUpdate(
            {},
            {
                lastBackup: new Date(),
                lastBackupSize: sizeFormatted,
                updatedBy: req.user._id,
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        const backupInfo = {
            timestamp: new Date(),
            status: 'success',
            collections: ['users', 'roles', 'auditlogs', 'modules', 'leaves', 'attendance'],
            fileName,
            sizeEstimate: sizeFormatted,
            message: 'Manual backup completed successfully',
        };

        await AuditLog.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'MANUAL_BACKUP',
            details: `Manual backup created: ${fileName} (${sizeFormatted})`,
            module: 'Infrastructure',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        res.status(200).json(backupInfo);
    } catch (error) {
        res.status(500).json({ message: 'Backup failed', error: error.message });
    }
};

// ─── Get Backup Settings ───────────────────────────────────────────────────
export const getBackupSettings = async (req, res) => {
    try {
        let settings = await BackupSettings.findOne();
        if (!settings) {
            settings = await BackupSettings.create({});
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load backup settings', error: error.message });
    }
};

// ─── Update Backup Settings ────────────────────────────────────────────────
export const updateBackupSettings = async (req, res) => {
    try {
        const allowedFields = [
            'autoBackup',
            'backupFrequency',
            'backupTime',
            'retentionDays',
            'backupLocation',
        ];
        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        updates.updatedBy = req.user._id;

        const settings = await BackupSettings.findOneAndUpdate(
            {},
            updates,
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
        );

        await AuditLog.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'UPDATE_BACKUP_SETTINGS',
            details: 'Backup settings updated',
            module: 'Infrastructure',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update backup settings', error: error.message });
    }
};
