// src/Components/settings/ProfileSettings.jsx
import { useEffect, useState } from "react";
import SettingsHeader from "./SettingsHeader.jsx";

export default function ProfileSettings({ user, onSave, saving }) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        department: user?.department || '',
        phone: user?.phone || '',
        address: user?.address || '',
        profileImage: user?.profileImage || '',
    });

    useEffect(() => {
        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            department: user?.department || '',
            phone: user?.phone || '',
            address: user?.address || '',
            profileImage: user?.profileImage || '',
        });
    }, [user]);

    const [avatarColor] = useState(() => {
        const colors = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#fc8181', '#68d391', '#f6ad55', '#63b3ed'];
        return colors[Math.floor(Math.random() * colors.length)];
    });

    const [previewUrl, setPreviewUrl] = useState(user?.profileImage || null);

    useEffect(() => {
        setPreviewUrl(user?.profileImage || null);
    }, [user?.profileImage]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                setPreviewUrl(result);
                setFormData(prev => ({ ...prev, profileImage: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        onSave(formData, 'profile');
    };

    const initials = formData.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="settings-card">
            <SettingsHeader 
                title="Profile Settings" 
                subtitle="Update your personal information"
                onSave={handleSubmit}
                saving={saving}
            />
            <div className="settings-card-body">
                <div className="settings-avatar-section">
                    <div className="settings-avatar" style={{ background: avatarColor }}>
                        {previewUrl || formData.profileImage ? (
                            <img 
                                src={previewUrl || formData.profileImage} 
                                alt="Avatar" 
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            initials || 'U'
                        )}
                    </div>
                    <div className="settings-avatar-actions">
                        <label className="btn-settings-secondary" style={{ cursor: 'pointer' }}>
                            Upload Photo
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                style={{ display: 'none' }}
                            />
                        </label>
                        {(previewUrl || formData.profileImage) && (
                            <button 
                                className="btn-settings-secondary" 
                                onClick={() => {
                                    setPreviewUrl(null);
                                    setFormData(prev => ({ ...prev, profileImage: '' }));
                                }}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>

                <hr className="settings-divider" />

                <div className="settings-form-row">
                    <div className="settings-form-group">
                        <label className="settings-form-label">Full Name <span className="required">*</span></label>
                        <input
                            type="text"
                            name="name"
                            className="settings-form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                        />
                    </div>
                    <div className="settings-form-group">
                        <label className="settings-form-label">Email <span className="required">*</span></label>
                        <input
                            type="email"
                            name="email"
                            className="settings-form-input"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            disabled
                        />
                    </div>
                </div>

                <div className="settings-form-row">
                    <div className="settings-form-group">
                        <label className="settings-form-label">Department</label>
                        <input
                            type="text"
                            name="department"
                            className="settings-form-input"
                            value={formData.department}
                            onChange={handleChange}
                            placeholder="Enter your department"
                        />
                    </div>
                    <div className="settings-form-group">
                        <label className="settings-form-label">Phone</label>
                        <input type="tel" name="phone" className="settings-form-input" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" />
                    </div>
                </div>

                <div className="settings-form-group">
                    <label className="settings-form-label">Bio</label>
                    <textarea
                        name="address"
                        className="settings-form-input settings-form-textarea"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your address"
                        rows={4}
                    />
                </div>
            </div>
        </div>
    );
}