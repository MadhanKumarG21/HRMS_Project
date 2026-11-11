// Backend/Controllers/roleController.js
// Manages roles: CRUD operations, default role handling, and audit logging.
import mongoose from 'mongoose';
import Role from '../Models/Role.js';
import User from '../Models/User.js';
import AuditLog from '../Models/AuditLog.js';
import { invalidateRoleCache } from '../config/roleCache.js';

// ─── Helper: Validate ObjectId ─────────────────────────────────────────────
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── Get All Roles ─────────────────────────────────────────────────────────
// Returns paginated list of roles sorted by newest first.
export const getAllRoles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [roles, total] = await Promise.all([
            Role.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Role.countDocuments(),
        ]);

        res.status(200).json({
            roles,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch roles', error: error.message });
    }
};

// ─── Get Single Role ───────────────────────────────────────────────────────
export const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid role ID format' });
        }

        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        res.status(200).json(role);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch role', error: error.message });
    }
};

// ─── Create Role ───────────────────────────────────────────────────────────
export const createRole = async (req, res) => {
    try {
        const { name, description, permissions, isDefault } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({ message: 'Role name is required' });
        }

        // Check for duplicate role name (case-insensitive)
        const existingRole = await Role.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingRole) {
            return res.status(409).json({ message: 'Role with this name already exists' });
        }

        // If setting as default, unset any existing default
        if (isDefault) {
            await Role.updateMany({ isDefault: true }, { $set: { isDefault: false } });
        }

        // Validate permissions is an array if provided
        if (permissions && !Array.isArray(permissions)) {
            return res.status(400).json({ message: 'Permissions must be an array' });
        }

        const newRole = await Role.create({
            name: name.trim(),
            description: description || '',
            permissions: permissions || [],
            isDefault: isDefault || false,
        });

        // A newly created role couldn't have been assigned to anyone yet
        // (they don't exist until now), so this isn't strictly required for
        // correctness — invalidating anyway keeps the cache's behavior
        // consistent and easy to reason about across all three mutations.
        invalidateRoleCache();

        await AuditLog.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'ROLE_CREATED',
            details: `Created role: ${name} with ${(permissions || []).length} permissions`,
            module: 'Roles & Permissions',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        res.status(201).json({
            message: 'Role created successfully',
            role: newRole,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create role', error: error.message });
    }
};

// ─── Update Role ───────────────────────────────────────────────────────────
export const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions, isDefault } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid role ID format' });
        }

        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Prevent renaming Admin role
        if (role.name === 'Admin' && name && name !== 'Admin') {
            return res.status(403).json({ message: 'Cannot rename the Admin role' });
        }

        // Check for duplicate name (excluding current role)
        if (name && name !== role.name) {
            const existingRole = await Role.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: id },
            });
            if (existingRole) {
                return res.status(409).json({ message: 'Role with this name already exists' });
            }
        }

        // If setting as default, unset any existing default
        if (isDefault && !role.isDefault) {
            await Role.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
        }

        // Prevent removing all:access from Admin
        if (role.name === 'Admin' && permissions && !permissions.includes('all:access')) {
            return res.status(403).json({ message: 'Admin role must have full access' });
        }

        // Validate permissions is an array if provided
        if (permissions && !Array.isArray(permissions)) {
            return res.status(400).json({ message: 'Permissions must be an array' });
        }

        const oldName = role.name;

        const updatedRole = await Role.findByIdAndUpdate(
            id,
            {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description }),
                ...(permissions && { permissions }),
                ...(isDefault !== undefined && { isDefault }),
            },
            { new: true, runValidators: true }
        );

        // If role name changed, update all users with old role name
        if (name && name !== oldName) {
            await User.updateMany({ role: oldName }, { role: name });
        }

        // A permissions or name change must take effect immediately —
        // without this, an admin revoking access would leave the old
        // (more permissive) permissions active for up to the cache's TTL.
        invalidateRoleCache();

        await AuditLog.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'ROLE_UPDATED',
            details: `Updated role: ${oldName}`,
            module: 'Roles & Permissions',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        res.status(200).json({
            message: 'Role updated successfully',
            role: updatedRole,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update role', error: error.message });
    }
};

// ─── Delete Role ───────────────────────────────────────────────────────────
export const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid role ID format' });
        }

        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Prevent deleting Admin role
        if (role.name === 'Admin') {
            return res.status(403).json({ message: 'Cannot delete the Admin role' });
        }

        // Check if any users are assigned this role (by role name string)
        const userCount = await User.countDocuments({ role: role.name });
        if (userCount > 0) {
            return res.status(409).json({
                message: 'Cannot delete role with assigned users',
                userCount,
            });
        }

        await Role.findByIdAndDelete(id);
        invalidateRoleCache();

        await AuditLog.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'ROLE_DELETED',
            details: `Deleted role: ${role.name}`,
            module: 'Roles & Permissions',
            severity: 'warning',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete role', error: error.message });
    }
};