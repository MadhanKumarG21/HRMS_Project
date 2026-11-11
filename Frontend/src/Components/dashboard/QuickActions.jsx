import { useState } from "react";
import { api} from "../../services/api.js";
import Icon from "../Icon.jsx";

export default function QuickActions() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleName: "Employee",
    department: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ACTIONS = [
    {
      icon: "person_add",
      label: "Create User",
      sub: "Onboard new employee",
      className: "q-primary",
      action: "createUser",
    },
    {
      icon: "backup",
      label: "Backup Now",
      sub: "Manual cloud snapshot",
      className: "q-success",
      action: "backup",
    },
    {
      icon: "file_export",
      label: "Export Logs",
      sub: "Generate CSV audit",
      className: "q-purple",
      action: "exportLogs",
    },
  ];

  const handleAction = async (actionType) => {
    setModalType(actionType);
    setModalData(null);
    setFormError("");
    setFormSuccess("");

    if (actionType === "createUser") {
      setFormData({
        name: "",
        email: "",
        password: "",
        roleName: "Employee",
        department: "",
      });
      setModalOpen(true);
      return;
    }

    if (actionType === "exportLogs") {
      try {
        const csvContent = await api.exportAuditLogsRaw("csv");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setFormSuccess("Logs exported successfully!");
        setTimeout(() => setFormSuccess(""), 3000);
      } catch (err) {
        console.error("Export failed:", err);
        setFormError(err.message || "Could not export logs.");
      }
      return;
    }

    if (actionType === "backup") {
      setModalOpen(true);
      setSubmitting(true);
      try {
        setModalData(await api.runBackup());
      } catch (err) {
        setFormError(err.message || "Backup failed");
      } finally {
        setSubmitting(false);
      }
      return;
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      await api.createUser(formData);
      setFormSuccess(`User ${formData.name} created successfully!`);
      setFormData({
        name: "",
        email: "",
        password: "",
        roleName: "Employee",
        department: "",
      });
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess("");
      }, 1500);
    } catch (err) {
      setFormError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError("");
    setFormSuccess("");
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setModalData(null);
    setFormError("");
    setFormSuccess("");
  };

  return (
    <>
      <div className="quick-actions-section">
        <div className="quick-actions-header">
          <h3 className="quick-actions-title">Quick Actions</h3>
          <p className="quick-actions-sub">Common administrative tasks</p>
        </div>
        <div className="quick-grid">
          {ACTIONS.map(({ icon, label, sub, className, action }) => (
            <button
              className={`quick-btn ${className}`}
              key={label}
              onClick={() => handleAction(action)}
            >
              <div className={`quick-icon ${className}`}>
                <Icon name={icon} />
              </div>
              <div className="quick-info">
                <div className="quick-label">{label}</div>
                <div className="quick-sub">{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/*Modal*/}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`modal-container ${
              modalType === "createUser" ? "modal-create-user" : ""
            } ${modalType === "backup" ? "modal-backup" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <h3 className="modal-title">
                {modalType === "createUser" && (
                  <>
                    <Icon name="person_add" className="modal-icon" />
                    Create New User
                  </>
                )}
                {modalType === "backup" && (
                  <>
                    <Icon name="backup" className="modal-icon" />
                    Backup Status
                  </>
                )}
              </h3>
              <button className="modal-close-btn" onClick={closeModal}>
                <Icon name="close" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Errors & Success */}
              {formError && (
                <div className="alert alert-error">
                  <Icon name="error" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="alert alert-success">
                  <Icon name="check_circle" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/*Create User Form*/}
              {modalType === "createUser" && (
                <form onSubmit={handleCreateUser} className="create-user-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="user-name">
                        Full Name <span className="required">*</span>
                      </label>
                      <input
                        id="user-name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        required
                        minLength={2}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="user-email">
                        Email <span className="required">*</span>
                      </label>
                      <input
                        id="user-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="user-password">
                        Password <span className="required">*</span>
                      </label>
                      <input
                        id="user-password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Min 6 characters"
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="user-role">Role</label>
                      <select
                        id="user-role"
                        name="roleName"
                        value={formData.roleName}
                        onChange={handleInputChange}
                      >
                        <option value="Employee">Employee</option>
                        <option value="Manager">Manager</option>
                        <option value="HR">HR</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="user-department">
                      Department <span className="required">*</span>
                    </label>
                    <input
                      id="user-department"
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="Engineering"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-sm" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Icon name="person_add" />
                          Create User
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/*Backup Results*/}
              {modalType === "backup" && (
                <div className="backup-results">
                  {submitting ? (
                    <div className="loading-state">
                      <div className="spinner" />
                      <p>Creating backup...</p>
                    </div>
                  ) : modalData ? (
                    <>
                      <div className="scan-status scan-success">
                        <Icon name="check_circle" />
                        <span>Backup Complete</span>
                      </div>

                      <div className="scan-details">
                        <div className="scan-row">
                          <span>File Name</span>
                          <strong>{modalData.fileName}</strong>
                        </div>
                        <div className="scan-row">
                          <span>Size Estimate</span>
                          <strong>{modalData.sizeEstimate}</strong>
                        </div>
                        <div className="scan-row">
                          <span>Collections</span>
                          <strong>{modalData.collections?.join(", ")}</strong>
                        </div>
                        <div className="scan-row">
                          <span>Timestamp</span>
                          <strong>
                            {modalData.timestamp
                              ? new Date(modalData.timestamp).toLocaleString()
                              : "N/A"}
                          </strong>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary btn-full"
                        onClick={closeModal}
                      >
                        Done
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
