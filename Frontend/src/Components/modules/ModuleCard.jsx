// src/Components/modules/ModuleCard.jsx
import { useState } from "react";
import Icon from "../Icon.jsx";

const CATEGORY_COLORS = {
    HR: { bg: "#F0FDF4", fg: "#16A34A", border: "#BBF7D0" },
    Finance: { bg: "#FFF7ED", fg: "#D97706", border: "#FDE68A" },
    IT: { bg: "#EFF6FF", fg: "#2563EB", border: "#BFDBFE" },
    General: { bg: "#F5F3FF", fg: "#7C3AED", border: "#DDD6FE" },
    Operations: { bg: "#FFF1F2", fg: "#DC2626", border: "#FECDD3" },
};

const CATEGORY_ICONS = {
    HR: "person",
    Finance: "trending_up",
    IT: "settings",
    General: "extension",
    Operations: "work",
};

export default function ModuleCard({ module, onToggle, onDelete }) {
    const [toggling, setToggling] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    const cat = CATEGORY_COLORS[module.category] || CATEGORY_COLORS.General;
    const icon = CATEGORY_ICONS[module.category] || "extension";
    const active = module.status === "Active";

    const handleToggle = async () => {
        if (toggling) return;
        setToggling(true);
        setError(null);
        try {
            await onToggle(module._id);
        } catch (err) {
            const errorMsg = err.message || "Failed to toggle module";
            setError(errorMsg);
            console.error("Toggle error:", err);
        } finally {
            setToggling(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete module "${module.label}"? This cannot be undone.`)) return;
        setDeleting(true);
        setError(null);
        try {
            await onDelete(module._id);
        } catch (err) {
            setError(err.message || "Failed to delete module");
            console.error("Delete error:", err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className={`mc-card ${!active ? "mc-card-suspended" : ""}`}>
            {/* Error message */}
            {error && (
                <div className="mc-error">
                    <Icon name="error" />
                    <span>{error}</span>
                </div>
            )}

            {/* Top row — icon + status badge */}
            <div className="mc-top">
                <div 
                    className="mc-icon-wrap" 
                    style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
                >
                    <Icon name={icon} style={{ color: cat.fg, fontSize: 22 }} />
                </div>
                <span className={`mc-status ${active ? "mc-status-active" : "mc-status-suspended"}`}>
                    <span className="mc-status-dot" />
                    {module.status}
                </span>
            </div>

            {/* Name + label */}
            <div className="mc-body">
                <h4 className="mc-label">{module.label}</h4>
                
                {module.description && <p className="mc-desc">{module.description}</p>}
            </div>

            {/* Category + order */}
            <div className="mc-meta">
                <span className="mc-category-badge" style={{ background: cat.bg, color: cat.fg }}>
                    {module.category || "General"}
                </span>
                <span className="mc-order">Order #{module.order ?? "—"}</span>
            </div>

            {/* Actions */}
            <div className="mc-footer">
                {/* Toggle switch */}
                <label 
                    className={`mc-toggle ${toggling ? "mc-toggle-loading" : ""}`} 
                    title={active ? "Suspend module" : "Activate module"}
                >
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={handleToggle}
                        disabled={toggling}
                    />
                    <span className="mc-toggle-track">
                        <span className="mc-toggle-thumb" />
                    </span>
                    <span className="mc-toggle-text">
                        {toggling ? "Saving…" : (active ? "Active" : "Suspended")}
                    </span>
                </label>

                {/* Delete */}
                <button
                    className="mc-delete-btn"
                    onClick={handleDelete}
                    disabled={deleting}
                    title="Delete module"
                >
                    <Icon name="delete" />
                </button>
            </div>
        </div>
    );
}