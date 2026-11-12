import { useModules } from "./modules/ModulesContext";
import { useAuth } from "../hooks/useAuth.jsx";
import Icon from "./Icon.jsx";

function AccessDeniedNotice({ moduleKey, reason }) {
    const moduleName = moduleKey
        ?.replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

    return (
        <section
            className={`module-gate-notice${reason ? " module-access-notice" : " module-maintenance-notice"}`}
            role="status"
        >
            <span className="module-gate-notice-icon" aria-hidden="true">
                <Icon name={reason ? "lock" : "warning"} />
            </span>
            <div>
                <h2>{reason ? "Access Restricted" : "Module Under Maintenance"}</h2>
                <p>
                    {reason || `${moduleName} is currently under maintenance. Please try again later.`}
                </p>
            </div>
        </section>
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
 * - "suspended" renders a maintenance notice instead of the real component.
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