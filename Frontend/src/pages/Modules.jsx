import { useState, useCallback } from "react";
import { api } from "../services/api.js";
import Icon from "../Components/Icon.jsx";
import ModuleStats from "../Components/modules/ModuleStats.jsx";
import ModuleFilters from "../Components/modules/ModuleFilters.jsx";
import ModuleCard from "../Components/modules/ModuleCard.jsx";
import CreateModuleModal from "../Components/modules/CreateModuleModal.jsx";
import { useModules } from "../Components/modules/ModulesContext.jsx";
import "../styles/Modules.css";

//Skeleton card

function SkeletonCard() {
  return (
    <div className="mc-card mc-skeleton-card">
      <div className="mc-top">
        <div
          className="sk-box"
          style={{ width: 44, height: 44, borderRadius: 10 }}
        />
        <div
          className="sk-box"
          style={{ width: 70, height: 20, borderRadius: 99 }}
        />
      </div>
      <div className="mc-body">
        <div
          className="sk-box"
          style={{ width: "60%", height: 16, marginBottom: 8 }}
        />
        <div
          className="sk-box"
          style={{ width: "40%", height: 12, marginBottom: 10 }}
        />
        <div className="sk-box" style={{ width: "90%", height: 12 }} />
      </div>
      <div className="mc-meta">
        <div
          className="sk-box"
          style={{ width: 60, height: 20, borderRadius: 4 }}
        />
        <div className="sk-box" style={{ width: 50, height: 12 }} />
      </div>
      <div className="mc-footer">
        <div
          className="sk-box"
          style={{ width: 100, height: 24, borderRadius: 99 }}
        />
        <div
          className="sk-box"
          style={{ width: 28, height: 28, borderRadius: 6 }}
        />
      </div>
    </div>
  );
}

//Empty state

function EmptyState({ filtered, onClear, onCreate }) {
  return (
    <div className="mod-empty">
      <div className="mod-empty-icon">
        <Icon name="extension" style={{ fontSize: 48, color: "#CBD5E1" }} />
      </div>
      {filtered ? (
        <>
          <p className="mod-empty-title">No modules match your filters</p>
          <button className="mod-empty-btn" onClick={onClear}>
            Clear filters
          </button>
        </>
      ) : (
        <>
          <p className="mod-empty-title">No modules yet</p>
          <p className="mod-empty-sub">Add your first module to get started</p>
          <button className="mod-empty-btn" onClick={onCreate}>
            <Icon name="person_add" /> Add Module
          </button>
        </>
      )}
    </div>
  );
}

//Main Page

export default function Modules() {
  const {
    modules,
    loading,
    error: contextError,
    refetchModules,
  } = useModules();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const fetchModules = useCallback(async () => {
    setError(contextError || "");
    await refetchModules(true);
  }, [contextError, refetchModules]);

  //Flash helper
  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  // Handlers
  const handleToggle = async (id) => {
    try {
      console.log("[Modules] Toggling module:", id);
      await api.toggleModule(id);
      await refetchModules(true);
      flash("Module status updated.");
    } catch (err) {
      const errorMsg = err.message || "Toggle failed.";
      setError(errorMsg);
      console.error("[Modules] Toggle error:", err);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      console.log("[Modules] Deleting module:", id);
      await api.deleteModule(id);
      await refetchModules(true);
      flash("Module deleted.");
    } catch (err) {
      setError(err.message || "Delete failed.");
    }
  };

  const handleCreate = async (formData) => {
    await api.createModule(formData);
    setShowCreate(false);
    await refetchModules(true);
    flash("Module created successfully.");
  };

  const handleClear = () => {
    setSearch("");
    setCategory("");
    setStatus("");
  };

  //Filter
  const filtered = modules.filter((m) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        m.name?.toLowerCase().includes(q) ||
        m.label?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)) &&
      (!category || m.category === category) &&
      (!status || m.status === status)
    );
  });

  //Render
  return (
    <div className="mod-page">
      {/* Header */}
      <header className="mod-header">
        <div>
          <h2 className="mod-title">Modules</h2>
          <p className="mod-sub">
            {loading
              ? "Loading..."
              : `${modules.length} modules · ${modules.filter((m) => m.status === "Active").length} active`}
          </p>
        </div>
        <div className="mod-header-actions">
          <button
            className="mod-refresh-btn"
            onClick={fetchModules}
            disabled={loading}
          >
            <Icon name="refresh" />
            Refresh
          </button>
          <button
            className="mod-create-btn"
            onClick={() => setShowCreate(true)}
          >
            <Icon name="person_add" />
            Add Module
          </button>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div className="mod-alert mod-alert-error">
          <Icon name="error" /> {error}
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}
      {success && (
        <div className="mod-alert mod-alert-success">
          <Icon name="check_circle" /> {success}
        </div>
      )}

      {/* Stats */}
      <ModuleStats modules={modules} loading={loading} />

      {/* Filters */}
      <ModuleFilters
        search={search}
        onSearch={setSearch}
        category={category}
        onCategory={setCategory}
        status={status}
        onStatus={setStatus}
        onClear={handleClear}
        total={modules.length}
        filtered={filtered.length}
      />

      {/* Grid */}
      {loading ? (
        <div className="mod-grid">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          filtered={!!(search || category || status)}
          onClear={handleClear}
          onCreate={() => setShowCreate(true)}
        />
      ) : (
        <div className="mod-grid">
          {filtered
            .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
            .map((mod) => (
              <ModuleCard
                key={mod._id}
                module={mod}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModuleModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
