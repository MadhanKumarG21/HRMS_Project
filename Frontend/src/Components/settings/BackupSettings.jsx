import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import Icon from "../Icon.jsx";
import SettingsHeader from "./SettingsHeader.jsx";

export default function BackupSettings({ settings, onSave, saving }) {
    const [formData, setFormData] = useState({
        autoBackup: settings.backup?.autoBackup ?? true,
        backupFrequency: settings.backup?.backupFrequency || "daily",
        backupTime: settings.backup?.backupTime || "02:00",
        retentionDays: settings.backup?.retentionDays || 30,
        backupLocation: settings.backup?.backupLocation || "local",
    });
    const [history, setHistory] = useState([]);
    const [running, setRunning] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        setFormData({
            autoBackup: settings.backup?.autoBackup ?? true,
            backupFrequency: settings.backup?.backupFrequency || "daily",
            backupTime: settings.backup?.backupTime || "02:00",
            retentionDays: settings.backup?.retentionDays || 30,
            backupLocation: settings.backup?.backupLocation || "local",
        });
    }, [settings.backup]);

    useEffect(() => {
        api.getBackupHistory()
            .then((result) => setHistory(result.history || []))
            .catch(() => setHistory([]));
    }, []);

    const handleChange = (event) => {
        const { name, value, checked, type } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
        }));
    };

    const handleRunBackup = async () => {
        try {
            setRunning(true);
            setMessage("");
            const result = await api.runManualBackup();
            setMessage(`${result.fileName} created successfully.`);
            const updatedHistory = await api.getBackupHistory();
            setHistory(updatedHistory.history || []);
        } catch (error) {
            setMessage(error.message || "Backup failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="settings-card">
            <SettingsHeader
                title="Backup"
                subtitle="Schedule backups and create a database snapshot"
                onSave={() => onSave(formData, "backup")}
                saving={saving}
            />
            <div className="settings-card-body">
                <div className="settings-form-row">
                    <div className="settings-form-group">
                        <label className="settings-form-label">Automatic backups</label>
                        <label className="settings-toggle-row">
                            <input
                                type="checkbox"
                                name="autoBackup"
                                checked={formData.autoBackup}
                                onChange={handleChange}
                            />
                            <span>{formData.autoBackup ? "Enabled" : "Disabled"}</span>
                        </label>
                    </div>
                    <div className="settings-form-group">
                        <label className="settings-form-label" htmlFor="backupFrequency">Frequency</label>
                        <select id="backupFrequency" name="backupFrequency" className="settings-form-select" value={formData.backupFrequency} onChange={handleChange}>
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>

                <div className="settings-form-row">
                    <div className="settings-form-group">
                        <label className="settings-form-label" htmlFor="backupTime">Backup time</label>
                        <input id="backupTime" type="time" name="backupTime" className="settings-form-input" value={formData.backupTime} onChange={handleChange} />
                    </div>
                    <div className="settings-form-group">
                        <label className="settings-form-label" htmlFor="retentionDays">Retention period</label>
                        <input id="retentionDays" type="number" min="1" max="3650" name="retentionDays" className="settings-form-input" value={formData.retentionDays} onChange={handleChange} />
                        <small className="settings-field-help">Days to keep backup files</small>
                    </div>
                </div>

                <div className="settings-form-group">
                    <label className="settings-form-label" htmlFor="backupLocation">Storage location</label>
                    <select id="backupLocation" name="backupLocation" className="settings-form-select" value={formData.backupLocation} onChange={handleChange}>
                        <option value="local">Local server storage</option>
                        <option value="external">External storage</option>
                        <option value="remote">Remote storage</option>
                        <option value="cloud">Cloud storage</option>
                    </select>
                </div>

                <hr className="settings-divider" />

                <div className="settings-action-row">
                    <div>
                        <h3>Manual backup</h3>
                        <p>Create a database snapshot now.</p>
                    </div>
                    <button type="button" className="btn-settings-primary" onClick={handleRunBackup} disabled={running || saving}>
                        <Icon name="backup" />
                        {running ? "Creating..." : "Run backup"}
                    </button>
                </div>
                {message && <p className="settings-field-message">{message}</p>}

                <hr className="settings-divider" />

                <div className="settings-backup-history">
                    <h3>Recent backup</h3>
                    {history.length === 0 ? (
                        <p className="settings-field-help">No backups have been created yet.</p>
                    ) : history.map((item) => (
                        <div className="settings-backup-history-row" key={item.id || item.fileName}>
                            <div>
                                <strong>{item.fileName}</strong>
                                <span>{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                            <span className="settings-status-pill">{item.status || "completed"}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
