const rateLimitMap = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 300;

export function rateLimit(identifier) {
    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    if (!entry || now - entry.windowStart > WINDOW_MS) {
        rateLimitMap.set(identifier, { windowStart: now, count: 1 });
        return { success: true, remaining: MAX_REQUESTS - 1 };
    }

    entry.count++;
    if (entry.count > MAX_REQUESTS) {
        return { success: false, remaining: 0 };
    }

    return { success: true, remaining: MAX_REQUESTS - entry.count };
}

// Clean up old entries periodically
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitMap) {
            if (now - entry.windowStart > WINDOW_MS * 2) {
                rateLimitMap.delete(key);
            }
        }
    }, WINDOW_MS * 5);
}
