// frontend/src/Components/usermagement/EmployeeModal.jsx
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import "../../styles/modals.css";

const getInitialFormData = (editingEmployee) => ({
  // Account
  name: editingEmployee?.name || "",
  email: editingEmployee?.email || "",
  password: "",
  confirmPassword: "",
  roleName: editingEmployee?.role || "",
  department: editingEmployee?.department || "",
  status: editingEmployee?.status || "Active",

  // Professional
  employeeId: editingEmployee?.employeeId || "",
  designation: editingEmployee?.designation || "",
  joiningDate: editingEmployee?.joiningDate ? new Date(editingEmployee.joiningDate).toISOString().split("T")[0] : "",

  // Personal
  dateOfBirth: editingEmployee?.dateOfBirth ? new Date(editingEmployee.dateOfBirth).toISOString().split("T")[0] : "",
  gender: editingEmployee?.gender || "Male",
  phone: editingEmployee?.phone || "",
  address: editingEmployee?.address || "",
  emergencyContact: editingEmployee?.emergencyContact || "",

  // Financial
  bankDetails: {
    accountNumber: editingEmployee?.bankDetails?.accountNumber || "",
    ifscCode: editingEmployee?.bankDetails?.ifscCode || "",
    bankName: editingEmployee?.bankDetails?.bankName || "",
  }
});

const EmployeeModal = ({
  open,
  onClose,
  roles=[],
  editingEmployee,
  onSaved,
  passwordPolicy = null,
}) => {
  const [formData, setFormData] = useState(() => getInitialFormData(editingEmployee));
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [apiErrors, setApiErrors] = useState([]);
  const [showRequirements, setShowRequirements] = useState(false);

  const policy = passwordPolicy || {
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
  };

  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData(editingEmployee));
      setPasswordErrors([]);
      setError("");
      setApiErrors([]);
      setPasswordStrength(0);
      setShowRequirements(false);
      setActiveTab("account");
    }
  }, [open, editingEmployee]);

  const validatePasswordWithPolicy = (password) => {
    const errors = [];
    if (!password) return errors;

    if (password.length < policy.minPasswordLength) {
      errors.push(`Must be at least ${policy.minPasswordLength} characters`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("At least one uppercase letter");
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("At least one lowercase letter");
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push("At least one number");
    }
    if (policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("At least one special character");
    }
    return errors;
  };

  const calculateStrength = (password) => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    return Math.min(score, 6);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("bank_")) {
      const field = name.replace("bank_", "");
      setFormData((prev) => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [field]: value,
        },
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setApiErrors([]);
    setPasswordErrors([]);

    if (name === "password") {
      setShowRequirements(true);
      if (value) {
        const errors = validatePasswordWithPolicy(value);
        setPasswordErrors(errors);
        setPasswordStrength(calculateStrength(value));
      } else {
        setPasswordErrors([]);
        setPasswordStrength(0);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setApiErrors([]);

    // Validation
    if (!formData.name || !formData.email || !formData.roleName || !formData.department) {
      setError("Please fill in all required fields on the Account tab.");
      setActiveTab("account");
      setLoading(false);
      return;
    }

    // Only validate password for new users or when password is being changed
    if (!editingEmployee) {
      if (!formData.password) {
        setError("Password is required for new users");
        setActiveTab("account");
        setLoading(false);
        return;
      }
      
      const errors = validatePasswordWithPolicy(formData.password);
      if (errors.length > 0) {
        setPasswordErrors(errors);
        setError("Password does not meet security policy");
        setActiveTab("account");
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setActiveTab("account");
        setLoading(false);
        return;
      }
    } else if (formData.password) {
      // Editing existing user with password change
      const errors = validatePasswordWithPolicy(formData.password);
      if (errors.length > 0) {
        setPasswordErrors(errors);
        setError("Password does not meet security policy");
        setActiveTab("account");
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setActiveTab("account");
        setLoading(false);
        return;
      }
    }

    try {
      // Build payload - only include fields that have values
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        roleName: formData.roleName,
        department: formData.department.trim(),
        status: formData.status || "Active",
      };

      // Only include password for new users or when changing password
      if (formData.password) {
        payload.password = formData.password;
      }

      // Add optional fields only if they have values
      if (formData.employeeId?.trim()) {
        payload.employeeId = formData.employeeId.trim();
      }
      if (formData.designation?.trim()) {
        payload.designation = formData.designation.trim();
      }
      if (formData.joiningDate) {
        payload.joiningDate = formData.joiningDate;
      }
      if (formData.dateOfBirth) {
        payload.dateOfBirth = formData.dateOfBirth;
      }
      if (formData.gender) {
        payload.gender = formData.gender;
      }
      if (formData.phone?.trim()) {
        payload.phone = formData.phone.trim();
      }
      if (formData.address?.trim()) {
        payload.address = formData.address.trim();
      }
      if (formData.emergencyContact?.trim()) {
        payload.emergencyContact = formData.emergencyContact.trim();
      }
      
      // Only include bank details if at least one field has a value
      const hasBankDetails = formData.bankDetails?.accountNumber?.trim() || 
                            formData.bankDetails?.ifscCode?.trim() || 
                            formData.bankDetails?.bankName?.trim();
      if (hasBankDetails) {
        payload.bankDetails = {
          accountNumber: formData.bankDetails.accountNumber?.trim() || "",
          ifscCode: formData.bankDetails.ifscCode?.trim() || "",
          bankName: formData.bankDetails.bankName?.trim() || "",
        };
      }

      let response;
      if (editingEmployee) {
        response = await api.updateUser(editingEmployee._id, payload);
      } else {
        response = await api.createUser(payload);
      }

      if (response?.employeeError) {
        // The account itself saved fine, but the Professional/Personal/
        // Financial data didn't (e.g. a duplicate Employee ID). Surface
        // this clearly rather than closing the modal as if everything
        // succeeded — an admin who filled in a full profile should know
        // if part of it didn't actually save.
        setError(
          `Account saved, but the employee profile could not be saved: ${response.employeeError}`,
        );
        setLoading(false);
        return;
      }

      await onSaved();
      onClose();
    } catch (err) {
      console.error("Employee save error:", err);
      console.error("Error details:", err.response || err.message);
      
      if (err.errors && Array.isArray(err.errors)) {
        setApiErrors(err.errors);
        setError(err.message || "Validation failed. Check account fields.");
        setActiveTab("account");
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to save record. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStrengthInfo = (strength) => {
    const levels = [
      { label: "Very Weak", color: "#e53e3e" },
      { label: "Weak", color: "#ed8936" },
      { label: "Fair", color: "#d69e2e" },
      { label: "Good", color: "#48bb78" },
      { label: "Strong", color: "#38a169" },
      { label: "Very Strong", color: "#2f855a" },
    ];
    return levels[Math.min(strength, levels.length - 1)] || levels[0];
  };

  const strengthInfo = getStrengthInfo(passwordStrength);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: "600px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2>{editingEmployee ? "Edit Employee Profile" : "Create New Employee"}</h2>

        {error && <div className="error-alert" style={{ color: "#e53e3e", padding: "10px", backgroundColor: "#fff5f5", borderRadius: "4px", marginBottom: "15px" }}>❌ {error}</div>}

        {apiErrors.length > 0 && (
          <div className="error-alert" style={{ color: "#e53e3e", padding: "10px", backgroundColor: "#fff5f5", borderRadius: "4px", marginBottom: "15px" }}>
            <h4>Failed validation:</h4>
            <ul>
              {apiErrors.map((err, i) => (
                <li key={i}>{err.msg || err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab Headers */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "20px" }}>
          {["account", "professional", "personal", "bank"].map((tab) => (
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
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tab 1: Account Credentials */}
          {activeTab === "account" && (
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              {!editingEmployee ? (
                <>
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                    />
                    {showRequirements && (
                      <div className="password-strength-wrapper" style={{ marginTop: "5px" }}>
                        <div className="strength-bar-bg" style={{ height: "4px", backgroundColor: "#edf2f7", borderRadius: "2px" }}>
                          <div
                            className="strength-bar"
                            style={{
                              height: "100%",
                              width: `${(passwordStrength / 6) * 100}%`,
                              backgroundColor: strengthInfo.color,
                              transition: "width 0.3s ease",
                              borderRadius: "2px",
                            }}
                          ></div>
                        </div>
                        <span style={{ fontSize: "11px", color: strengthInfo.color }}>
                          {strengthInfo.label}
                        </span>
                        {passwordErrors.length > 0 && (
                          <ul style={{ fontSize: "11px", color: "#e53e3e", paddingLeft: "15px", marginTop: "5px" }}>
                            {passwordErrors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter new password to change"
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                  />
                  {formData.password && showRequirements && (
                    <div className="password-strength-wrapper" style={{ marginTop: "5px" }}>
                      <div className="strength-bar-bg" style={{ height: "4px", backgroundColor: "#edf2f7", borderRadius: "2px" }}>
                        <div
                          className="strength-bar"
                          style={{
                            height: "100%",
                            width: `${(passwordStrength / 6) * 100}%`,
                            backgroundColor: strengthInfo.color,
                            transition: "width 0.3s ease",
                            borderRadius: "2px",
                          }}
                        ></div>
                      </div>
                      <span style={{ fontSize: "11px", color: strengthInfo.color }}>
                        {strengthInfo.label}
                      </span>
                      {passwordErrors.length > 0 && (
                        <ul style={{ fontSize: "11px", color: "#e53e3e", paddingLeft: "15px", marginTop: "5px" }}>
                          {passwordErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {formData.password && (
                    <div className="form-group" style={{ marginTop: "10px" }}>
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm new password"
                        style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Role *</label>
                <select 
                  name="roleName" 
                  value={formData.roleName} 
                  onChange={handleChange} 
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Department *</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Engineering, HR"
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Status</label>
                <select 
                  name="status" 
                  value={formData.status} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab 2: Professional Details */}
          {activeTab === "professional" && (
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <p style={{ gridColumn: "span 2", margin: "0 0 4px", fontSize: "12px", color: "#718096" }}>
                Fill in Designation and Joining Date to create a full employee
                profile (this, plus Personal and Financial info, is stored
                separately from the login account). Leaving these blank
                creates a login-only account with no employee record.
              </p>
              <div className="form-group">
                <label>Employee ID (Leave blank to auto-generate)</label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  placeholder="e.g. EMP-00001"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Senior Developer"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Joining Date</label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Personal Info */}
          {activeTab === "personal" && (
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1234567890"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group">
                <label>Emergency Contact</label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  placeholder="Name / Relationship / Phone"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Home address details"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>
            </div>
          )}

          {/* Tab 4: Financial Info */}
          {activeTab === "bank" && (
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  name="bank_bankName"
                  value={formData.bankDetails.bankName}
                  onChange={handleChange}
                  placeholder="Chase, Bank of America, etc."
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  name="bank_accountNumber"
                  value={formData.bankDetails.accountNumber}
                  onChange={handleChange}
                  placeholder="Account Number"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>IFSC / Route Code</label>
                <input
                  type="text"
                  name="bank_ifscCode"
                  value={formData.bankDetails.ifscCode}
                  onChange={handleChange}
                  placeholder="IFSC or routing number"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e0" }}
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: "25px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;