// Backend/config/roleCache.js
// Mirrors securityCache.js's pattern. verifyToken needs to resolve a
// user's permissions from their Role on every authenticated request —
// without a cache that's one extra DB query per request, for data
// (role → permissions) that changes rarely.
import Role from '../Models/Role.js';

let cachedRoles = null; // Map<lowercased role name, permissions[]>
let lastFetched = 0;
const TTL = 5 * 60 * 1000; // 5 minutes TTL (invalidated when roles change)

const loadRoles = async () => {
  const roles = await Role.find().select('name permissions').lean();
  const map = new Map();
  for (const role of roles) {
    map.set(role.name.toLowerCase(), role.permissions || []);
  }
  return map;
};

// Returns the permissions array for a role name (case-insensitive), or []
// if no matching Role document exists (e.g. the role was deleted after
// being assigned to a user, or was never created in the first place).
export const getCachedPermissionsForRole = async (roleName) => {
  const now = Date.now();
  if (!cachedRoles || now - lastFetched > TTL) {
    try {
      cachedRoles = await loadRoles();
      lastFetched = now;
    } catch (error) {
      console.error('[RoleCache] Error loading roles:', error.message);
      // Fail closed: an empty map means everyone gets zero permissions
      // until the next successful refresh, rather than silently granting
      // access based on stale or partial data.
      return [];
    }
  }
  return cachedRoles.get(roleName?.toLowerCase()) || [];
};

export const invalidateRoleCache = () => {
  cachedRoles = null;
  lastFetched = 0;
};