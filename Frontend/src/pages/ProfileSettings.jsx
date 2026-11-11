import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";
import Icon from "../Components/Icon.jsx";
import "../styles/ProfileSettings.css";

const initialForm = {
  name: "",
  phone: "",
  address: "",
  dateOfBirth: "",
  gender: "",
};

const formatDateForInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
};

export default function ProfileSettings() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [originalForm, setOriginalForm] = useState(initialForm);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.getMyProfile();

      const data = response?.profile || response?.data || response;

      const user = data?.user || {};
      const employee = data?.employee || {};

      setProfile(data);

      const nextForm = {
        name: user.name || "",
        phone: employee.phone || "",
        address: employee.address || "",
        dateOfBirth: formatDateForInput(employee.dateOfBirth),
        gender: employee.gender || "",
      };

      setForm(nextForm);
      setOriginalForm(nextForm);
    } catch (err) {
      setError(err.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setSuccess("");
    setError("");
  };

  const validateForm = () => {
    const name = form.name.trim();

    if (!name) {
      return "Name is required.";
    }

    if (name.length < 2) {
      return "Name must contain at least 2 characters.";
    }

    if (name.length > 100) {
      return "Name cannot exceed 100 characters.";
    }

    if (form.phone.length > 30) {
      return "Phone number is too long.";
    }

    if (form.address.length > 500) {
      return "Address cannot exceed 500 characters.";
    }

    if (form.dateOfBirth) {
      const date = new Date(form.dateOfBirth);

      if (Number.isNaN(date.getTime())) {
        return "Please enter a valid date of birth.";
      }

      if (date > new Date()) {
        return "Date of birth cannot be in the future.";
      }
    }

    return "";
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    if (!isDirty) {
      setSuccess("There are no changes to save.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.updateMyProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
      });

      const updatedProfile =
        response?.profile || response?.data || response;

      const updatedUser = updatedProfile?.user || {};
      const updatedEmployee = updatedProfile?.employee || {};

      const nextForm = {
        name: updatedUser.name || "",
        phone: updatedEmployee.phone || "",
        address: updatedEmployee.address || "",
        dateOfBirth: formatDateForInput(updatedEmployee.dateOfBirth),
        gender: updatedEmployee.gender || "",
      };

      setProfile(updatedProfile);
      setForm(nextForm);
      setOriginalForm(nextForm);

      setSuccess(
        response?.message || "Profile updated successfully."
      );
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(originalForm);
    setError("");
    setSuccess("");
  };

  const getInitials = () => {
    const name = profile?.user?.name || "User";

    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <span className="material-symbols-outlined spin">
            progress_activity
          </span>
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-error-card">
          <Icon name="error" />
          <h2>Profile unavailable</h2>
          <p>{error || "Unable to load your profile."}</p>

          <button
            type="button"
            className="profile-primary-btn"
            onClick={loadProfile}
          >
            <Icon name="refresh" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const user = profile.user || {};
  const employee = profile.employee || {};

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div>
          <h1>Profile Settings</h1>
          <p>
            Manage your personal information and employee profile.
          </p>
        </div>

        <div className="profile-header-status">
          <span className="material-symbols-outlined">
            verified_user
          </span>
          Account secured
        </div>
      </header>

      {error && (
        <div className="profile-alert profile-alert-error">
          <Icon name="error" />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <Icon name="close" />
          </button>
        </div>
      )}

      {success && (
        <div className="profile-alert profile-alert-success">
          <Icon name="check_circle" />
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>
            <Icon name="close" />
          </button>
        </div>
      )}

      <div className="profile-layout">
        {/* PROFILE SUMMARY */}
        <aside className="profile-sidebar">
          <div className="profile-card profile-summary">
            <div className="profile-avatar">
              {getInitials()}
            </div>

            <h2>{user.name || "User"}</h2>

            <p className="profile-email">
              {user.email || "No email available"}
            </p>

            <span className="profile-role">
              {user.role || "Employee"}
            </span>

            <div className="profile-divider" />

            <div className="profile-meta">
              <div>
                <span>Employee ID</span>
                <strong>{employee.employeeId || "—"}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{employee.department || "—"}</strong>
              </div>

              <div>
                <span>Designation</span>
                <strong>{employee.designation || "—"}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong
                  className={
                    employee.status === "Active"
                      ? "profile-status-active"
                      : "profile-status-other"
                  }
                >
                  {employee.status || "—"}
                </strong>
              </div>
            </div>
          </div>

        </aside>

        {/* FORM */}
        <main className="profile-card profile-form-card">
          <div className="profile-section-heading">
            <div className="section-icon">
              <Icon name="person" />
            </div>

            <div>
              <h2>Personal Information</h2>
              <p>
                Keep your personal information up to date.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="profile-form-grid">
              <div className="profile-field profile-field-full">
                <label htmlFor="name">
                  Full Name
                  <span>*</span>
                </label>

                <div className="profile-input-wrapper">
                  <Icon name="person" />

                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div className="profile-field">
                <label>Email Address</label>

                <div className="profile-input-wrapper profile-readonly">
                  <Icon name="mail" />

                  <input
                    value={user.email || ""}
                    readOnly
                    disabled
                  />

                  <span className="material-symbols-outlined">
                    lock
                  </span>
                </div>

                <small>
                  Email changes should use a verified account-change
                  workflow.
                </small>
              </div>

              <div className="profile-field">
                <label>Username</label>

                <div className="profile-input-wrapper profile-readonly">
                  <Icon name="alternate_email" />

                  <input
                    value={user.username || ""}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="phone">Phone Number</label>

                <div className="profile-input-wrapper">
                  <Icon name="phone" />

                  <input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    maxLength={30}
                  />
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="dateOfBirth">
                  Date of Birth
                </label>

                <div className="profile-input-wrapper">
                  <Icon name="calendar_month" />

                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="gender">Gender</label>

                <div className="profile-input-wrapper">
                  <Icon name="wc" />

                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="profile-field profile-field-full">
                <label htmlFor="address">Address</label>

                <div className="profile-input-wrapper profile-textarea">
                  <Icon name="home" />

                  <textarea
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter your current address"
                    maxLength={500}
                    rows={4}
                  />
                </div>

                <small>
                  {form.address.length}/500 characters
                </small>
              </div>
            </div>

            {/* EMPLOYMENT INFORMATION */}
            <div className="profile-section-heading employment-heading">
              <div className="section-icon">
                <Icon name="badge" />
              </div>

              <div>
                <h2>Employment Information</h2>
                <p>
                  These details are maintained by HR and cannot be
                  edited here.
                </p>
              </div>
            </div>

            <div className="profile-readonly-grid">
              <div>
                <span>Employee ID</span>
                <strong>{employee.employeeId || "—"}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{employee.department || "—"}</strong>
              </div>

              <div>
                <span>Designation</span>
                <strong>{employee.designation || "—"}</strong>
              </div>

              <div>
                <span>Joining Date</span>
                <strong>
                  {employee.joiningDate
                    ? new Date(
                        employee.joiningDate
                      ).toLocaleDateString()
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Employment Status</span>
                <strong>{employee.status || "—"}</strong>
              </div>

              <div>
                <span>Role</span>
                <strong>{user.role || "—"}</strong>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="profile-actions">
              <button
                type="button"
                className="profile-secondary-btn"
                onClick={handleCancel}
                disabled={!isDirty || saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="profile-primary-btn"
                disabled={!isDirty || saving}
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined spin">
                      progress_activity
                    </span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon name="save" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}