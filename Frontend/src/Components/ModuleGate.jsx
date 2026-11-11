import { useModules } from "./modules/ModulesContext";
import { useAuth } from "../hooks/useAuth.jsx";

function AccessDeniedNotice({ moduleKey, reason }) {
    return (
        <div className="module-suspended">
            <h2>{reason ? "Access Restricted" : "Module Unavailable"}</h2>
            <p>
                {reason || `The "${moduleKey}" module is currently suspended. Contact your administrator if you believe this is a mistake.`}
            </p>
        </div>
    );
}

function ModuleLoading() {
    return (
        <div className="module-loading">
            <div className="spinner" />
            <p>Checking module status...</p>
        </div>
    );
}

/**
 * Wraps a page/component and only renders it when its module status is "active".
 * - "unknown" (modules still loading, or module not found in the list) shows a spinner.
 * - "suspended" renders a blocked placeholder instead of the real component.
 *
 * Usage: <ModuleGate moduleKey="employees"><Employees /></ModuleGate>
 */
export default function ModuleGate({ moduleKey, permission, adminOnly = false, children }) {
    const { getModuleStatus } = useModules();
    const { hasPermission, isAdmin } = useAuth();
    const status = getModuleStatus(moduleKey);

    if (status === "unknown") return <ModuleLoading />;
    if (status === "suspended") return <AccessDeniedNotice moduleKey={moduleKey} />;
    const permissions = Array.isArray(permission) ? permission : [permission];
    if (adminOnly && !isAdmin) {
        return <AccessDeniedNotice reason="This page is available to administrators only." />;
    }
    if (permissions.filter(Boolean).length && !permissions.some(hasPermission)) {
        return <AccessDeniedNotice reason="Your role does not have permission to access this page." />;
    }
    return children;
}