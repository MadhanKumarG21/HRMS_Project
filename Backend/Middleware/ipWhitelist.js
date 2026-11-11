import IPWhitelistEntry from '../Models/IPWhitelistEntry.js';
import SecuritySettings from '../Models/SecuritySettings.js';
import { getClientIP } from '../Utils/getIP.js';

export const checkIPWhitelist = async (req, res, next) => {
    try {
        const clientIP = getClientIP(req);

        // Check if IP whitelist feature is enabled in security settings
        const settings = await SecuritySettings.findOne();
        if (!settings?.ipWhitelistEnabled) {
            return next();
        }

        // Check if the client IP is in the whitelist (supports IPv4, IPv6, and CIDR)
        const whitelisted = await IPWhitelistEntry.findOne({ 
            ip: clientIP,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });

        if (!whitelisted) {
            console.warn(`[IP Whitelist] Access denied for IP: ${clientIP}`);

            return res.status(403).json({ 
                error: 'Access denied - IP not whitelisted' 
            });
        }

        next();

    } catch (error) {
        console.error('IP whitelist check error:', error);
        next(); // Fail open - don't block on error
    }
};