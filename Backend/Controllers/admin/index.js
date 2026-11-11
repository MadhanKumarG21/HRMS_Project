// Backend/Controllers/admin/index.js
// Central barrel export for all admin controllers.
export {
    createUserAccount,
    validatePasswordPolicy,
    getPasswordPolicy,
    getAllUsers,
    getUserById,
    updateUser,
    toggleUserStatus,
    deleteUser,
} from './userController.js';

export {
    getAuditLogs,
    exportAuditLogs,
} from './auditController.js';

export {
    getDashboardStats,
} from './statsController.js';

export {
    getAllModules,
    getModuleById,
    createModule,
    toggleModuleStatus,
    deleteModule,
    getModuleStats,
    updateModuleOrder,
} from './moduleController.js';

export {
    globalSearch,
} from './searchController.js';

export {
    runBackup,
    getBackupSettings,
    updateBackupSettings,
} from './backupController.js';

export {
    getAllAttendance,
    getAttendanceById,
    getAttendanceByUserId,
    getAttendanceByDate,
    createAttendance,
    updateAttendance,
    getAttendanceStats,
} from './attendanceController.js';

export {
    getAllLeaves,
    getLeaveById,
    getLeaveByUserId,
    createLeave,
    updateLeaveStatus,
    getLeaveStats,
} from './leaveController.js';

export {
    getAllUsers as getAllEmployees,
    getUserById as getEmployeeById,
    getUserById as getEmployeeByUserId,
    createUserAccount as createEmployee,
    updateUser as updateEmployee,
    deleteUser as deleteEmployee,
    getEmployeeStats,
} from './userController.js';

export {
    getReportTypes,
    generateEmployeeReport,
    generateAttendanceReport,
    generateLeaveReport,
    generatePayrollReport,
} from './reportsController.js';

export {
    getIntegrationsStatus,
} from './Integrationscontroller.js';

export {
    getAllSettings,
    saveAllSettings,
    getCompanySettings,
    updateCompanySettings,
    getBackupSettings as getSettingsBackupSettings,
    updateBackupSettings as updateSettingsBackupSettings,
    runManualBackup,
    restoreFromBackup,
    getBackupHistory,
} from './settingsController.js';

