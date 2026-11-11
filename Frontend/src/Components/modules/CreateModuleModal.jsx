import { useState } from "react";
import Icon from "../Icon.jsx";

const CATEGORIES = ["HR", "Finance", "IT", "General", "Operations"];

const EMPTY = { name: "", label: "", category: "General", description: "", order: 0 };

export default function CreateModuleModal({ onClose, onSave }) {
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: k === "order" ? Number(e.target.value) : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.label.trim()) {
      setError("Name and Label are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || "Failed to create module.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cm-header">
          <div>
            <h3 className="cm-title">Add New Module</h3>
            <p className="cm-sub">Register a new feature module in the system</p>
          </div>
          <button className="cm-close-btn" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {/* Form */}
        <form className="cm-body" onSubmit={handleSubmit}>

          {error && (
            <div className="cm-error">
              <Icon name="error" /> {error}
            </div>
          )}

          <div className="cm-field-row">
            <div className="cm-field">
              <label>Module Key <span className="cm-req">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. LeaveMgmt"
                required
                minLength={2}
              />
              <span className="cm-hint">Unique identifier, no spaces</span>
            </div>
            <div className="cm-field">
              <label>Display Label <span className="cm-req">*</span></label>
              <input
                type="text"
                value={form.label}
                onChange={set("label")}
                placeholder="e.g. Leave Management"
                required
                minLength={2}
              />
            </div>
          </div>

          <div className="cm-field-row">
            <div className="cm-field">
              <label>Category</label>
              <select value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="cm-field">
              <label>Display Order</label>
              <input
                type="number"
                value={form.order}
                onChange={set("order")}
                min={0}
                max={999}
              />
              <span className="cm-hint">Lower number = appears first</span>
            </div>
          </div>

          <div className="cm-field">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="Brief description of what this module does..."
              rows={3}
            />
          </div>

          <div className="cm-footer">
            <button type="button" className="cm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="cm-btn-primary" disabled={saving}>
              {saving ? "Creating..." : "Create Module"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}