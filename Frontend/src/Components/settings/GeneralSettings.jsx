// src/Components/settings/GeneralSettings.jsx
import { useEffect, useState } from "react";
import SettingsHeader from "./SettingsHeader.jsx";

export default function GeneralSettings({ settings, onSave, saving }) {
    const [formData, setFormData] = useState({
        companyName: settings.company?.companyName || 'TechNova HRMS',
        companyEmail: settings.company?.companyEmail || 'admin@technova.com',
        companyPhone: settings.company?.companyPhone || '',
        companyAddress: settings.company?.companyAddress || '',
        timezone: settings.company?.timezone || 'Asia/Kolkata',
        dateFormat: settings.company?.dateFormat || 'MM/DD/YYYY',
        language: settings.company?.language || 'en',
        fiscalYearStart: settings.company?.fiscalYearStart || 'January',
    });

    useEffect(() => {
        setFormData({
            companyName: settings.company?.companyName || 'TechNova HRMS',
            companyEmail: settings.company?.companyEmail || 'admin@technova.com',
            companyPhone: settings.company?.companyPhone || '',
            companyAddress: settings.company?.companyAddress || '',
            timezone: settings.company?.timezone || 'Asia/Kolkata',
            dateFormat: settings.company?.dateFormat || 'MM/DD/YYYY',
            language: settings.company?.language || 'en',
            fiscalYearStart: settings.company?.fiscalYearStart || 'January',
        });
    }, [settings.company]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(formData, 'company');
    };

    return (
        <div className="settings-card">
            <SettingsHeader 
                title="General Settings" 
                subtitle="Configure your company and system preferences"
                onSave={handleSubmit}
                saving={saving}
            />
            <div className="settings-card-body">
                <div className="settings-form-row">
                    <div className="settings-form-group">
                        <label className="settings-form-label">Company Name <span className="required">*</span></label>
                        <input
                            type="text"
                            name="companyName"
                            className="settings-form-input"
                            value={formData.companyName}
                            onChange={handleChange}
                            placeholder="Enter company name"
                        />
                    </div>
                    <div className="settings-form-group">
                        <label className="settings-form-label">Company Email <span className="required">*</span></label>
                        <input
                            type="email"
                            name="companyEmail"
                            className="settings-form-input"
                            value={formData.companyEmail}
                            onChange={handleChange}
                            placeholder="Enter company email"
                        />
                    </div>
                </div>

                <div className="settings-form-row">
                    <div className="settings-form-group">
                        <label className="settings-form-label">Company Phone</label>
                        <input
                            type="text"
                            name="companyPhone"
                            className="settings-form-input"
                            value={formData.companyPhone}
                            onChange={handleChange}
                            placeholder="Enter phone number"
                        />
                    </div>
                    <div className="settings-form-group">
                        <label className="settings-form-label">Timezone</label>
                        <select
                            name="timezone"
                            className="settings-form-select"
                            value={formData.timezone}
                            onChange={handleChange}
                        >
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="Europe/London">GMT (UTC+0)</option>
                            <option value="Asia/Kolkata">India Standard Time (IST)</option>
                            <option value="Asia/Singapore">Singapore Time (SGT)</option>
                            <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                            <option value="Pacific/Auckland">New Zealand Time (NZST)</option>
                        </select>
                    </div>
                </div>

                <div className="settings-form-group">
                    <label className="settings-form-label">Company Address</label>
                    <textarea
                        name="companyAddress"
                        className="settings-form-input settings-form-textarea"
                        value={formData.companyAddress}
                        onChange={handleChange}
                        placeholder="Enter company address"
                        rows={3}
                    />
                </div>

                <div className="settings-form-row">
                    <div className="settings-form-group">
                        <label className="settings-form-label">Date Format</label>
                        <select
                            name="dateFormat"
                            className="settings-form-select"
                            value={formData.dateFormat}
                            onChange={handleChange}
                        >
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                        </select>
                    </div>
                    <div className="settings-form-group">
                        <label className="settings-form-label">Language</label>
                        <select
                            name="language"
                            className="settings-form-select"
                            value={formData.language}
                            onChange={handleChange}
                        >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="zh">Chinese</option>
                            <option value="hi">Hindi</option>
                            <option value="ar">Arabic</option>
                        </select>
                    </div>
                </div>

                <div className="settings-form-group">
                    <label className="settings-form-label">Fiscal Year Start</label>
                    <select
                        name="fiscalYearStart"
                        className="settings-form-select"
                        value={formData.fiscalYearStart}
                        onChange={handleChange}
                    >
                        <option value="January">January</option>
                        <option value="April">April</option>
                        <option value="July">July</option>
                        <option value="October">October</option>
                    </select>
                </div>
            </div>
        </div>
    );
}