// frontend/src/Components/usermagement/EmployeeDetailModal.jsx
// Read-only "view details" modal — opens when an employee's name is clicked.
// Mirrors EmployeeModal.jsx's tabbed layout (Account / Professional /
// Personal / Financial) but displays values instead of editable inputs.
import { useState, useEffect } from "react";
import "../../styles/modals.css";

const TABS = ["account", "professional", "personal", "bank"];

const TAB_LABELS = {
  account: "Account",
  professional: "Professional",
  personal: "Personal",
  bank: "Financial",
};

// Small read-only "label / value" row, reused across every tab.
function Field({ label, value }) {
  return (
    <div className="form-group">
      <label style={{ color: "#718096", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </label>
      <div
        style={{
          padding: "8px 0",
          fontSize: "14px",
          color: "#1a202c",
          borderBottom: "1px solid #edf2f7",
          minHeight: "20px",
        }}
      >
        {value || <span style={{ color: "#a0aec0" }}>—</span>}
      </div>
    </div>
  );
}

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

const getStatusBadge = (status) => {
  const classes = {
    Active: "status-active",
    Inactive: "status-inactive",
    "On Leave": "status-leave",
    Terminated: "status-terminated",
  };
  return `status-badge ${classes[status] || "status-active"}`;
};

export default function EmployeeDetailModal({ open, onClose, employee, onEdit }) {
  const [activeTab, setActiveTab] = useState("account");

  // Reset to the first tab every time a different employee is opened.
  useEffect(() => {
    if (open) setActiveTab("account");
  }, [open, employee]);

  if (!open || !employee) return null;

  const initials =
    employee.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: "600px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
        {/* Header: avatar + name + status, matching the create/edit modal's title area */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#3182ce",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{employee.name}</h2>
            <p style={{ margin: "2px 0 0", color: "#718096", fontSize: "13px" }}>
              {employee.designation || employee.role} · {employee.department}
            </p>
          </div>
          <span className={getStatusBadge(employee.status)}>{employee.status}</span>
        </div>

        {/* Tab Headers — same inline pattern as EmployeeModal.jsx for visual consistency */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", margin: "16px 0 20px" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 15px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontWeight: activeTab === tab ? "bold" : "normal",
                borderBottom: activeTab === tab ? "2px solid #3182ce" : "none",
                color: activeTab === tab ? "#3182ce" : "#4a5568",
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab 1: Account */}
        {activeTab === "account" && (
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 15px" }}>
            <Field label="Employee ID" value={employee.employeeId || "PENDING"} />
            <Field label="Email" value={employee.email} />
            <Field label="Role" value={employee.role} />
            <Field label="Department" value={employee.department} />
            <Field label="Status" value={employee.status} />
            <Field
              label="Last Login"
              value={employee.lastLogin ? new Date(employee.lastLogin).toLocaleString() : "Never"}
            />
            <Field
              label="2FA"
              value={employee.twoFactorEnabled ? "Enabled" : "Disabled"}
            />
          </div>
        )}

        {/* Tab 2: Professional */}
        {activeTab === "professional" && (
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 15px" }}>
            <Field label="Employee ID" value={employee.employeeId} />
            <Field label="Designation" value={employee.designation} />
            <Field label="Joining Date" value={formatDate(employee.joiningDate)} />
            <Field label="Department" value={employee.department} />
          </div>
        )}

        {/* Tab 3: Personal */}
        {activeTab === "personal" && (
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 15px" }}>
            <Field label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
            <Field label="Gender" value={employee.gender} />
            <Field label="Phone Number" value={employee.phone} />
            <Field label="Emergency Contact" value={employee.emergencyContact} />
            <div style={{ gridColumn: "span 2" }}>
              <Field label="Address" value={employee.address} />
            </div>
          </div>
        )}

        {/* Tab 4: Financial */}
        {activeTab === "bank" && (
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 15px" }}>
            <Field label="Bank Name" value={employee.bankDetails?.bankName} />
            <Field label="Account Number" value={employee.bankDetails?.accountNumber} />
            <div style={{ gridColumn: "span 2" }}>
              <Field label="IFSC / Route Code" value={employee.bankDetails?.ifscCode} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions" style={{ marginTop: "25px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              onEdit(employee);
            }}
          >
            Edit Employee
          </button>
        </div>
      </div>
    </div>
  );
}