// Backend/config/securityCache.js
import SecuritySettings from '../Models/SecuritySettings.js';

let cachedSettings = null;
let lastFetched = 0;
const TTL = 10000; // 10 seconds cache TTL

export const getCachedSecuritySettings = async () => {
    const now = Date.now();
    if (!cachedSettings || (now - lastFetched) > TTL) {
        try {
            cachedSettings = await SecuritySettings.findOne();
            lastFetched = now;
        } catch (error) {
            console.error('[SecurityCache] Error fetching security settings:', error.message);
        }
    }
    return cachedSettings;
};

export const invalidateSecuritySettingsCache = () => {
    cachedSettings = null;
    lastFetched = 0;
};
