// utils/securityAlerts.js
import { sendEmail } from './email.js';

// Simple HTML-escaping utility to prevent XSS in email templates
const escapeHtml = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export const sendSecurityAlert = async (user, action, details = {}) => {
    try {
        const safeName = escapeHtml(user.name);
        const safeAction = escapeHtml(action);
        const safeIp = escapeHtml(details.ip || 'Unknown');
        const safeDevice = escapeHtml(details.device || 'Unknown');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const html = `
            <h2>Security Alert</h2>
            <p>Dear ${safeName},</p>
            <p>A security event occurred on your HRMS account:</p>
            <ul>
                <li><strong>Action:</strong> ${safeAction}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>IP Address:</strong> ${safeIp}</li>
                <li><strong>Device:</strong> ${safeDevice}</li>
            </ul>
            <p>If this was you, no action is needed.</p>
            <p>If this was not you, please review your account activity immediately.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">HRMS Security System • ${new Date().toISOString()}</p>
        `;

        await sendEmail({
            to: user.email,
            subject: `Security Alert: ${safeAction}`,
            html
        });

    } catch (error) {
        console.error('Failed to send security alert:', error);
    }
};

export const logSecurityEvent = async (data) => {
    try {
        if (!data.action) {
            console.warn('logSecurityEvent called without required action field');
            return;
        }
        await SecurityAudit.create({
            userId: data.userId,
            email: data.email,
            action: data.action,
            severity: data.severity || 'info',
            details: data.details || {},
            ip: data.ip,
            userAgent: data.userAgent
        });
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
};