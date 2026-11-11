// Backend/Controllers/admin/employeeController.js
// Manages employee profiles: CRUD, stats, and audit logging.
import mongoose from 'mongoose';
import Employee from '../../Models/Employee.js';
import User from '../../Models/User.js';
import AuditLog from '../../Models/AuditLog.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Fields no one but an Admin (or the employee themself) should see in a
// directory-style lookup — bank details, DOB, home address, and emergency
// contact are sensitive PII, not something every coworker needs to browse.
// This only matters now that login isn't Admin-only anymore: previously
// these endpoints were unreachable by anyone who wasn't already an Admin,
// so the lack of field-level restriction here was harmless by accident.
const SENSITIVE_EMPLOYEE_FIELDS = ['bankDetails', 'dateOfBirth', 'address', 'emergencyContact', 'phone', 'documents'];

const isAdminRequester = (req) => {
    const role = typeof req.user?.role === 'object' ? req.user.role?.name : req.user?.role;
    return role?.toLowerCase() === 'admin';
};

// Strips sensitive fields from an Employee doc unless the requester is an
// Admin or the record belongs to them. Accepts a Mongoose doc or plain object.
const sanitizeEmployee = (employee, req) => {
    const isSelf = String(employee.userId?._id || employee.userId) === String(req.user?._id);
    if (isAdminRequester(req) || isSelf) return employee;

    const plain = employee.toObject ? employee.toObject() : { ...employee };
    for (const field of SENSITIVE_EMPLOYEE_FIELDS) {
        delete plain[field];
    }
    return plain;
};

// ─── Get Employee by ID ────────────────────────────────────────────────────
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid employee ID format' });
        }

        const employee = await Employee.findById(id)
            .populate('userId', 'name email role status');

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        return res.status(200).json(sanitizeEmployee(employee, req));
    } catch (error) {
        console.error('[Employee] GetById error:', error);
        return res.status(500).json({ message: 'Failed to fetch employee', error: error.message });
    }
};

// ─── Get Employee by User ID ───────────────────────────────────────────────
export const getEmployeeByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const employee = await Employee.findOne({ userId })
            .populate('userId', 'name email role status');

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        return res.status(200).json(sanitizeEmployee(employee, req));
    } catch (error) {
        console.error('[Employee] GetByUserId error:', error);
        return res.status(500).json({ message: 'Failed to fetch employee', error: error.message });
    }
};

// ─── Create Employee ───────────────────────────────────────────────────────
export const createEmployee = async (req, res) => {
    try {
        const allowedFields = [
            'userId', 'employeeId', 'department', 'designation', 
            'joiningDate', 'dateOfBirth', 'gender', 'phone', 
            'address', 'emergencyContact', 'bankDetails', 'status'
        ];
        
        const payload = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                payload[field] = req.body[field];
            }
        }

        const { userId, employeeId, department, designation, joiningDate, status } = payload;

        if (!userId || !employeeId || !department || !designation || !joiningDate || !status) {
            return res.status(400).json({
                message: 'User ID, Employee ID, department, designation, joining date, and status are required',
            });
        }

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const existingUserEmployee = await Employee.findOne({ userId });
        if (existingUserEmployee) {
            return res.status(400).json({ message: 'An employee record already exists for this user' });
        }

        const existingEmployee = await Employee.findOne({ employeeId });
        if (existingEmployee) {
            return res.status(400).json({ message: 'Employee ID already exists' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const employee = await Employee.create(payload);

        await AuditLog.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'EMPLOYEE_CREATED',
            details: `Created employee: ${employeeId} for ${user.name}`,
            module: 'Employee Management',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        return res.status(201).json({ message: 'Employee created successfully', employee });
    } catch (error) {
        console.error('[Employee] Create error:', error);
        return res.status(500).json({ message: 'Failed to create employee', error: error.message });
    }
};

// ─── Update Employee ───────────────────────────────────────────────────────
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid employee ID format' });
        }

        const allowedFields = [
            'department', 'designation', 'joiningDate', 'dateOfBirth', 
            'gender', 'phone', 'address', 'emergencyContact', 'bankDetails', 'status'
        ];
        
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        updates.updatedAt = new Date();

        const employee = await Employee.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        }).populate('userId', 'name email role status');

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        await AuditLog.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'EMPLOYEE_UPDATED',
            details: `Updated employee: ${employee.employeeId}`,
            module: 'Employee Management',
            severity: 'info',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        return res.status(200).json({ message: 'Employee updated successfully', employee });
    } catch (error) {
        console.error('[Employee] Update error:', error);
        return res.status(500).json({ message: 'Failed to update employee', error: error.message });
    }
};

// ─── Delete Employee ───────────────────────────────────────────────────────
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid employee ID format' });
        }

        const employee = await Employee.findByIdAndDelete(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        await AuditLog.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'EMPLOYEE_DELETED',
            details: `Deleted employee: ${employee.employeeId}`,
            module: 'Employee Management',
            severity: 'warning',
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
        });

        return res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('[Employee] Delete error:', error);
        return res.status(500).json({ message: 'Failed to delete employee', error: error.message });
    }
};

// ─── Get All Employees ─────────────────────────────────────────────────────
export const getAllEmployees = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const skip = (page - 1) * limit;
        const { department, status } = req.query;

        const filter = {};
        if (department) filter.department = department;
        if (status) filter.status = status;

        const [employees, total] = await Promise.all([
            Employee.find(filter)
                .populate('userId', 'name email role status')
                .sort({ employeeId: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Employee.countDocuments(filter),
        ]);

        return res.status(200).json({
            data: employees.map((emp) => sanitizeEmployee(emp, req)),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('[Employee] GetAll error:', error);
        return res.status(500).json({ message: 'Failed to fetch employees', error: error.message });
    }
};

// ─── Get Employee Stats ────────────────────────────────────────────────────
export const getEmployeeStats = async (req, res) => {
    try {
        const [statsAgg, total] = await Promise.all([
            Employee.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Employee.countDocuments()
        ]);

        let active = 0;
        let inactive = 0;
        let onLeave = 0;
        let terminated = 0;

        for (const item of statsAgg) {
            if (item._id === 'Active') active = item.count;
            else if (item._id === 'Inactive') inactive = item.count;
            else if (item._id === 'On Leave') onLeave = item.count;
            else if (item._id === 'Terminated') terminated = item.count;
        }

        return res.status(200).json({ total, active, inactive, onLeave, terminated });
    } catch (error) {
        console.error('[Employee] Stats error:', error);
        return res.status(500).json({ message: 'Failed to fetch employee stats', error: error.message });
    }
};