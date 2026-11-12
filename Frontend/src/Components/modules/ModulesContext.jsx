import {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useState,
    useMemo,
} from "react";

import {api} from "../../services/api";
import { useAuth } from "../../hooks/useAuth.jsx";

const ModulesContext = createContext(null);

/**
 * Normalize module status.
 */
function normalizeStatus(mod) {
    if (typeof mod.status === "string") {
        return mod.status.toLowerCase();
    }

    if (typeof mod.isActive === "boolean") {
        return mod.isActive ? "active" : "suspended";
    }

    if (typeof mod.enabled === "boolean") {
        return mod.enabled ? "active" : "suspended";
    }

    return "suspended";
}

export function ModulesProvider({ children }) {
    const { isAuthenticated, loading: authLoading } = useAuth();

    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchModules = useCallback(async (showLoading = true) => {
        // Don't call API if user is not authenticated
        if (!isAuthenticated) {
            setModules([]);
            setError("");
            setLoading(false);
            return;
        }

        if (showLoading) setLoading(true);
        setError("");

        try {
            const data = await api.getModules();

            setModules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("[ModulesContext] Failed to load modules:", err);

            setError(err.message || "Failed to load modules.");
            setModules([]);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        // Wait until AuthProvider finishes checking the session
        if (authLoading) {
            return;
        }

        // Only fetch modules for authenticated users
        if (!isAuthenticated) {
            setModules([]);
            setError("");
            setLoading(false);
            return;
        }

        fetchModules();
    }, [authLoading, isAuthenticated, fetchModules]);

    const moduleMap = useMemo(() => {
        return modules.reduce((acc, mod) => {
            if (mod?.name) {
                acc[mod.name.toLowerCase()] = mod;
            }

            return acc;
        }, {});
    }, [modules]);

    const getModuleStatus = useCallback(
        (moduleKey) => {
            if (!moduleKey || !String(moduleKey).trim()) {
                return "active";
            }

            if (loading) {
                return "unknown";
            }

            const key = String(moduleKey).toLowerCase();
            const mod =
                moduleMap[key] ||
                (key === "notification" ? moduleMap["notifications"] : undefined) ||
                (key === "notifications" ? moduleMap["notification"] : undefined);

            if (!mod) {
                return "unknown";
            }

            return normalizeStatus(mod);
        },
        [moduleMap, loading]
    );

    const isModuleActive = useCallback(
        (moduleKey) => {
            return getModuleStatus(moduleKey) === "active";
        },
        [getModuleStatus]
    );

    const value = {
        modules,
        loading,
        error,
        refetchModules: fetchModules,
        getModuleStatus,
        isModuleActive,
    };

    return (
        <ModulesContext.Provider value={value}>
            {children}
        </ModulesContext.Provider>
    );
}

export function useModules() {
    const ctx = useContext(ModulesContext);

    if (!ctx) {
        throw new Error(
            "useModules must be used within a ModulesProvider"
        );
    }

    return ctx;
}