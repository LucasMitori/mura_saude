import type { H3Event } from "h3";

interface RateBucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, RateBucket>();

function getClientId(event: H3Event): string {
    const fwd =
        getHeader(event, "x-forwarded-for") ||
        getHeader(event, "x-real-ip") ||
        "";
    const ip =
        (fwd.split(",")[0] || "").trim() ||
        event.node.req.socket?.remoteAddress ||
        "unknown";
    return ip;
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
