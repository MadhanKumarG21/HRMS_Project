import { useModules } from "./modules/ModulesContext";

function SuspendedNotice({ moduleKey }) {
    return (
        <div className="module-suspended">
            <h2>Module Unavailable</h2>
            <p>
                The "{moduleKey}" module is currently suspended. Contact your
                administrator if you believe this is a mistake.
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
export default function ModuleGate({ moduleKey, children }) {
    const { getModuleStatus } = useModules();
    const status = getModuleStatus(moduleKey);

    if (status === "unknown") return <ModuleLoading />;
    if (status === "suspended") return <SuspendedNotice moduleKey={moduleKey} />;
    return children;
}