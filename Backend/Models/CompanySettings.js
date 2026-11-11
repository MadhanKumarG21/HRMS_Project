import mongoose from 'mongoose';

const CompanySettingsSchema = new mongoose.Schema({
    companyName: { type: String, default: 'TechNova HRMS' },
    companyEmail: { type: String, default: 'admin@technova.com' },
    companyPhone: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    companyLogo: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    language: { type: String, default: 'en' },
    fiscalYearStart: { type: String, default: 'January' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const CompanySettings = mongoose.models.CompanySettings || mongoose.model('CompanySettings', CompanySettingsSchema);
export default CompanySettings;