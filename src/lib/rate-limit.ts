
interface RateLimitStore {
    [ip: string]: {
        count: number;
        lastReset: number;
    };
}

const rateLimitStore: RateLimitStore = {};
const WINDOW_MS = 60 * 1000; // 1 Minute
const LIMIT = 20; // 20 requests per minute

/**
 * Checks if the request has exceeded the rate limit.
 * @param ip The IP address of the user.
 * @throws Error if rate limit exceeded.
 */
export function checkRateLimit(ip: string) {
    const now = Date.now();
    const record = rateLimitStore[ip] || { count: 0, lastReset: now };

    if (now - record.lastReset > WINDOW_MS) {
        // Reset window
        record.count = 1;
        record.lastReset = now;
    } else {
        // Increment count
        record.count++;
    }

    rateLimitStore[ip] = record;

    if (record.count > LIMIT) {
        throw new Error("Local Rate Limit Exceeded");
    }
}
