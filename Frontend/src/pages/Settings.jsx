// src/pages/Settings.jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { api } from "../services/api.js";
import SettingsSidebar from "../Components/settings/SettingsSidebar.jsx";
import GeneralSettings from "../Components/settings/GeneralSettings.jsx";
import ProfileSettings from "../Components/settings/ProfileSettings.jsx";
import BackupSettings from "../Components/settings/BackupSettings.jsx";
import "../styles/Settings.css";

const SETTINGS_SECTIONS = ["general", "profile", "backup"];

export default function Settings() {
  const { user, refresh } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const [activeSection, setActiveSection] = useState(() =>
    SETTINGS_SECTIONS.includes(requestedSection) ? requestedSection : "general",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState({
    company: {},
    backup: {},
  });

  useEffect(() => {
    if (SETTINGS_SECTIONS.includes(requestedSection)) {
      setActiveSection(requestedSection);
    }
  }, [requestedSection]);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (section === "general") next.delete("section");
      else next.set("section", section);
      return next;
    }, { replace: true });
  };

  //  Load Settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [data, backup] = await Promise.all([
        api.getSettings(),
        api.getBackupSettings().catch(() => ({})),
      ]);
      setSettings({
        company: data.company || {},
        backup: backup || {},
      });
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError("Failed to load settings: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  //  Handle Save
  const handleSave = async (sectionData, sectionName) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (sectionName === "backup") {
        const result = await api.updateBackupSettings(sectionData);
        setSettings((prev) => ({ ...prev, backup: result.settings || sectionData }));
        setSuccess("Backup settings saved successfully!");
      } else if (sectionName === "profile") {
        const updatedUser = await api.updateUser(user._id || user.id, {
          name: sectionData.name,
          department: sectionData.department,
          phone: sectionData.phone,
          address: sectionData.address,
          profileImage: sectionData.profileImage || "",
        });
        await refresh();
        setSuccess("Profile settings saved successfully!");
        if (updatedUser?.user) setSettings((prev) => ({ ...prev, user: updatedUser.user }));
      } else {
        const updatedSettings = {
          ...settings,
          [sectionName]: { ...settings[sectionName], ...sectionData },
        };
        await api.saveSettings(updatedSettings);
        setSettings(updatedSettings);
        setSuccess(`${sectionName === "company" ? "General" : sectionName} settings saved successfully!`);
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save settings: " + err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  //  Handle Backup
  const handleBackup = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await api.runManualBackup();
      setSuccess(`Backup completed! File: ${result.fileName}`);
      setTimeout(() => setSuccess(""), 3000);
      await loadSettings();
    } catch (err) {
      setError("Backup failed: " + err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  //  Render Sections
  const renderSection = () => {
    const props = {
      settings,
      onSave: handleSave,
      saving,
      user,
      onBackup: handleBackup,
    };

    switch (activeSection) {
      case "general":
        return <GeneralSettings {...props} />;
      case "profile":
        return <ProfileSettings {...props} />;
      case "backup":
        return <BackupSettings {...props} />;
      default:
        return <GeneralSettings {...props} />;
    }
  };

  //  Loading
  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-sidebar" style={{ height: "400px" }} />
        <div className="settings-content">
          <div
            className="settings-card"
            style={{ padding: "60px 20px", textAlign: "center" }}
          >
            <div className="spinner" />
            <p style={{ marginTop: "16px", color: "#718096" }}>
              Loading settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  //  Render
  return (
    <div className="settings-page">
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      <div className="settings-content">
        {error && (
          <div className="settings-error" style={{ marginBottom: "16px" }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="settings-success" style={{ marginBottom: "16px" }}>
            ✅ {success}
          </div>
        )}
        {renderSection()}
      </div>
    </div>
  );
}
