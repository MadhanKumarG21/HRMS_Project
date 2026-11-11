// Backend/Controllers/admin/moduleController.js
// Manages system modules: CRUD, status toggling, ordering, and statistics.
import mongoose from 'mongoose';
import Module from '../../Models/Modules.js';
import AuditLog from '../../Models/AuditLog.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

let cachedModules = null;
let modulesCacheExpiresAt = 0;
const MODULES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export const invalidateModulesCache = () => {
    cachedModules = null;
    modulesCacheExpiresAt = 0;
};

// ─── Get All Modules ───────────────────────────────────────────────────────
export const getAllModules = async (req, res) => {
    try {
        const now = Date.now();
        if (cachedModules && now < modulesCacheExpiresAt) {
            return res.status(200).json(cachedModules);
        }

        const modules = await Module.find().sort({ order: 1 }).lean();
        cachedModules = modules;
        modulesCacheExpiresAt = now + MODULES_CACHE_TTL;

        res.status(200).json(modules);
    } catch (error) {
        console.error('[Modules] Get all error:', error);
        res.status(500).json({
            message: 'Failed to fetch modules',
            error: error.message,
        });
    }
};

// ─── Get Module by ID ──────────────────────────────────────────────────────
export const getModuleById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid module ID format' });
        }

        const module = await Module.findById(id);
        if (!module) {
            return res.status(404).json({ message: 'Module not found' });
        }

        res.status(200).json(module);
    } catch (error) {
        console.error('[Modules] Get by ID error:', error);
        res.status(500).json({
            message: 'Failed to fetch module',
            error: error.message,
        });
    }
};

// ─── Create Module ─────────────────────────────────────────────────────────
export const createModule = async (req, res) => {
    try {
        const { name, label, description, category, order } = req.body;

        if (!name || !label) {
            return res.status(400).json({ message: 'Name and label are required' });
        }

        const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (normalizedName.length < 2) {
            return res.status(400).json({ message: 'Module key must contain at least 2 letters or numbers' });
        }

        // Case-insensitive duplicate check
        const existing = await Module.findOne({
            name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
        });
        if (existing) {
            return res.status(400).json({ message: 'Module name already exists' });
        }

        const module = await Module.create({
            name: normalizedName,
            label: label.trim(),
            description: description || '',
            category: category || 'General',
            order: order || 0,
            status: 'Active',
        });

        await AuditLog.create({
            adminId: req.user?._id,
            adminName: req.user?.name || 'System',
            action: 'MODULE_CREATED',
            details: `Created module: ${label}`,
            module: 'Modules',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        invalidateModulesCache();

        res.status(201).json({
            message: 'Module created successfully',
            module,
        });
    } catch (error) {
        console.error('[Modules] Create error:', error);
        res.status(500).json({
            message: 'Failed to create module',
            error: error.message,
        });
    }
};

// ─── Toggle Module Status ──────────────────────────────────────────────────
// Note: findByIdAndUpdate triggers the schema's pre('findOneAndUpdate') middleware.
export const toggleModuleStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid module ID format' });
        }

        const module = await Module.findById(id);
        if (!module) {
            return res.status(404).json({ message: 'Module not found' });
        }

        const currentStatus = module.status || 'Active';
        const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';

        const updatedModule = await Module.findByIdAndUpdate(
            id,
            { status: newStatus },
            { returnDocument: 'after', runValidators: true }
        );

        await AuditLog.create({
            adminId: req.user?._id,
            adminName: req.user?.name || 'System',
            action: 'MODULE_TOGGLED',
            details: `Toggled module ${module.label} from ${currentStatus} to ${newStatus}`,
            module: 'Modules',
            severity: 'warning',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        invalidateModulesCache();

        res.status(200).json({
            success: true,
            message: `Module ${newStatus.toLowerCase()} successfully`,
            module: updatedModule,
            oldStatus: currentStatus,
            newStatus,
        });
    } catch (error) {
        console.error('[Modules] Toggle error:', error);
        res.status(500).json({
            message: 'Failed to toggle module',
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        });
    }
};

// ─── Delete Module ─────────────────────────────────────────────────────────
export const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid module ID format' });
        }

        const module = await Module.findByIdAndDelete(id);
        if (!module) {
            return res.status(404).json({ message: 'Module not found' });
        }

        await AuditLog.create({
            adminId: req.user?._id,
            adminName: req.user?.name || 'System',
            action: 'MODULE_DELETED',
            details: `Deleted module: ${module.label}`,
            module: 'Modules',
            severity: 'warning',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        invalidateModulesCache();

        res.status(200).json({
            success: true,
            message: 'Module deleted successfully',
        });
    } catch (error) {
        console.error('[Modules] Delete error:', error);
        res.status(500).json({
            message: 'Failed to delete module',
            error: error.message,
        });
    }
};

// ─── Get Module Stats ──────────────────────────────────────────────────────
export const getModuleStats = async (req, res) => {
    try {
        const [total, active, suspended] = await Promise.all([
            Module.countDocuments(),
            Module.countDocuments({ status: 'Active' }),
            Module.countDocuments({ status: 'Suspended' }),
        ]);

        res.status(200).json({ total, active, suspended });
    } catch (error) {
        console.error('[Modules] Stats error:', error);
        res.status(500).json({
            message: 'Failed to fetch module stats',
            error: error.message,
        });
    }
};

// ─── Update Module Order ───────────────────────────────────────────────────
// Uses bulkWrite for atomic, efficient bulk updates.
export const updateModuleOrder = async (req, res) => {
    try {
        const { modules } = req.body;

        if (!modules || !Array.isArray(modules)) {
            return res.status(400).json({ message: 'Modules array is required' });
        }

        const bulkOps = modules.map((item) => {
            if (!isValidObjectId(item.id)) {
                throw new Error(`Invalid module ID: ${item.id}`);
            }
            return {
                updateOne: {
                    filter: { _id: item.id },
                    update: { $set: { order: item.order } },
                },
            };
        });

        await Module.bulkWrite(bulkOps);

        invalidateModulesCache();

        res.status(200).json({
            success: true,
            message: 'Module order updated successfully',
        });
    } catch (error) {
        console.error('[Modules] Update order error:', error);
        res.status(500).json({
            message: 'Failed to update module order',
            error: error.message,
        });
    }
};
