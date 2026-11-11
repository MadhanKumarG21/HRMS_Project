// src/Components/settings/SettingsSidebar.jsx
import Icon from "../Icon.jsx";

const SETTINGS_SECTIONS = [
    { id: 'general', icon: 'settings', label: 'General' },
    { id: 'profile', icon: 'person', label: 'Profile' },
    { id: 'backup', icon: 'backup', label: 'Backup' },
];

export default function SettingsSidebar({ activeSection, onSectionChange }) {
    return (
        <div className="settings-sidebar">
            <div className="settings-sidebar-title">Settings</div>
            {SETTINGS_SECTIONS.map((section) => (
                <button
                    key={section.id}
                    className={`settings-sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => onSectionChange(section.id)}
                >
                    <span className="icon"><Icon name={section.icon} /></span>
                    {section.label}
                </button>
            ))}
        </div>
    );
}