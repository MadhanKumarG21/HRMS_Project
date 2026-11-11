// src/Components/settings/SettingsHeader.jsx

export default function SettingsHeader({ title, subtitle, onSave, saving }) {
    return (
        <div className="settings-card-header">
            <div>
                <h2 className="settings-card-title">{title}</h2>
                <p className="settings-card-subtitle">{subtitle}</p>
            </div>
            {onSave && (
                <button
                    className="btn-settings-primary"
                    onClick={onSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            )}
        </div>
    );
}