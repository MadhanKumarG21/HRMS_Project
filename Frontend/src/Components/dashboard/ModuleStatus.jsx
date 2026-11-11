import { useState } from "react";
import { api } from "../../services/api.js";
import { useModules } from "../modules/ModulesContext.jsx";

function Toggle({ moduleData, onToggle }) {
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    setLoading(true);
    try {
      await onToggle(moduleData._id);
    } catch (err) {
      console.error("Toggle failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const isActive = moduleData.status === "Active";
  return (
    <label
      className={`toggle ${loading ? "toggle-loading" : ""}`}
      aria-label="Toggle module"
    >
      <input
        type="checkbox"
        checked={isActive}
        onChange={handleChange}
        disabled={loading}
      />
      <span className="toggle-track" />
      <span className="toggle-thumb" />
    </label>
  );
}

export default function ModuleStatus() {
  const { modules, loading, refetchModules } = useModules();

  const handleToggle = async (id) => {
    await api.toggleModule(id);
    await refetchModules(false);
  };
  const activeCount = modules?.filter((m) => m.status === "Active").length ?? 0;
  const suspendedCount =
    modules?.filter((m) => m.status === "Suspended").length ?? 0;

  if (loading) {
    return (
      <div className="card">
        <div className="mod-head">
          <div className="card-title" style={{ marginBottom: 0 }}>
            Module status
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-row" />
        ))}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mod-head">
        <div className="card-title" style={{ marginBottom: 0 }}>
          Module status
        </div>
        <span className="mod-meta">
          {activeCount} active / {suspendedCount} suspended
        </span>
      </div>
      <div className="mod-grid">
        {modules?.map((mod) => (
          <div
            className={`mod-row ${mod.status === "Suspended" ? "suspended" : ""}`}
            key={mod._id}
          >
            <span className="mod-label">{mod.label}</span>
            <Toggle moduleData={mod} onToggle={handleToggle} />
          </div>
        ))}
      </div>
    </div>
  );
}
