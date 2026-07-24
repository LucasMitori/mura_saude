import type { H3Event } from "h3";

interface RateBucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, RateBucket>();

/**
 * Resolve the client IP for rate limiting WITHOUT trusting spoofable input.
 *
 * `X-Forwarded-For` is attacker-controlled unless a trusted proxy sets it, and
 * taking its left-most entry (the classic mistake) lets anyone bypass every
 * limit by sending a random value per request. So we only accept:
 *   1. platform headers that the edge overwrites and a client cannot forge, then
 *   2. the LAST X-Forwarded-For hop (the one our nearest trusted proxy appended)
 *      — and only when TRUST_PROXY is explicitly enabled, then
 *   3. the raw socket address, which cannot be spoofed.
 */
function getClientId(event: H3Event): string {
    const platform =
        getHeader(event, "x-vercel-forwarded-for") ||
        getHeader(event, "cf-connecting-ip") ||
        "";
    if (platform) return platform.trim();

    if (process.env.TRUST_PROXY === "true") {
        const fwd = getHeader(event, "x-forwarded-for") || "";
        const hops = fwd.split(",").map((h) => h.trim()).filter(Boolean);
        const nearest = hops[hops.length - 1];
        if (nearest) return nearest;
    }

    return event.node.req.socket?.remoteAddress || "unknown";
}

export function rateLimit(
    event: H3Event,
    options?: { key?: string; max?: number; windowMs?: number },
): void {
    const config = useRuntimeConfig();
    const max = options?.max ?? Number(config.rateLimitMax || 20);
    const windowMs = options?.windowMs ?? Number(config.rateLimitWindowMs || 60_000);
    const key = `${options?.key || "default"}:${getClientId(event)}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
    }

    bucket.count += 1;

    setHeader(event, "X-RateLimit-Limit", String(max));
    setHeader(event, "X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    setHeader(event, "X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        event.node.res.setHeader("Retry-After", String(retryAfter));
        throw createError({
            statusCode: 429,
            statusMessage: "Too many requests. Please slow down and try again later.",
            message: "Too many requests. Please slow down and try again later.",
        });
    }
}

setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets.entries()) {
        if (b.resetAt < now) buckets.delete(k);
    }
}, 5 * 60_000).unref?.();
