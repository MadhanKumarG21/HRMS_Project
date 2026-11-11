import { useState } from "react";
import { api } from "../../services/api";
import Icon from "../Icon";
import "../../styles/modals.css";

const getInitialFormData = (editingRole) => ({
  name: editingRole?.name || "",
  description: editingRole?.description || "",
  permissions: editingRole?.permissions || [],
  isDefault: editingRole?.isDefault || false,
});

const RoleModal = ({
  open,
  onClose,
  editingRole,
  allPermissions,
  onRoleSaved,
}) => {
  const [formData, setFormData] = useState(() =>
    getInitialFormData(editingRole),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const togglePermission = (permKey) => {
    setFormData((prev) => {
      const hasPerm = prev.permissions.includes(permKey);
      if (hasPerm) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => p !== permKey),
        };
      }
      return { ...prev, permissions: [...prev.permissions, permKey] };
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.permissions.length === 0) {
      setError("Select at least one permission");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (editingRole) {
        await api.updateRole(editingRole._id, formData);
      } else {
        await api.createRole(formData);
      }
      onRoleSaved();
    } catch (err) {
      setError(err.message || "Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Group permissions by category
  const grouped = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {editingRole ? "Edit Role" : "Create New Role"}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">
                Role Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., HR Manager"
                required
                disabled={editingRole?.name === "Admin"}
              />
              {editingRole?.name === "Admin" && (
                <p className="form-hint">Admin role name cannot be changed</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                name="description"
                className="form-input"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of this role"
              />
            </div>

            <div className="form-group">
              <label className="form-label flex-between">
                <span>Permissions</span>
                <span className="perm-count">
                  {formData.permissions.length} selected
                </span>
              </label>

              <div className="permissions-picker">
                {Object.entries(grouped).map(([category, perms]) => (
                  <div className="perm-category" key={category}>
                    <h4 className="perm-category-title">{category}</h4>
                    <div className="perm-options">
                      {perms.map((perm) => {
                        const isSelected = formData.permissions.includes(
                          perm.key,
                        );
                        return (
                          <button
                            type="button"
                            key={perm.key}
                            className={`perm-option ${isSelected ? "selected" : ""}`}
                            onClick={() => togglePermission(perm.key)}
                          >
                            <span className="perm-check">
                              {isSelected ? (
                                <Icon name="check_box" />
                              ) : (
                                <Icon name="check_box_outline_blank" />
                              )}
                            </span>
                            <span className="perm-label">{perm.label}</span>
                            <span className="perm-key">{perm.key}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                />
                <span className="checkbox-text">
                  Set as default role for new users
                </span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : editingRole
                  ? "Update Role"
                  : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;
