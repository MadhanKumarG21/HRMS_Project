// Middleware/statsTracker.js
// Lightweight in-memory request stats tracker used to power live dashboard
// metrics (avg API response time, request-success-based "uptime %").
//
// NOTE: This resets on server restart and is per-process — fine for a
// single-instance deployment. If you scale to multiple instances, move
// `requestStats` to Redis (INCR/HINCRBY) so counters are shared.

const requestStats = {
    totalRequests: 0,
    errorRequests: 0, // status >= 500
    totalResponseTimeMs: 0,
    serverStartTime: Date.now(),
};

export const statsTracker = (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        requestStats.totalRequests += 1;
        requestStats.totalResponseTimeMs += durationMs;
        if (res.statusCode >= 500) {
            requestStats.errorRequests += 1;
        }
    });

    next();
};

export const getRequestStats = () => {
    const { totalRequests, errorRequests, totalResponseTimeMs, serverStartTime } = requestStats;

    const avgResponseTime =
        totalRequests > 0 ? Math.round(totalResponseTimeMs / totalRequests) : 0;

    // % of requests that did NOT 5xx — a practical uptime proxy without
    // external monitoring infrastructure.
    const uptimePercent =
        totalRequests > 0
            ? Number((((totalRequests - errorRequests) / totalRequests) * 100).toFixed(2))
            : 100;

    return {
        avgResponseTime,
        uptimePercent,
        totalRequests,
        errorRequests,
        processUptimeSeconds: Math.floor(process.uptime()),
        trackingSince: new Date(serverStartTime),
    };
};