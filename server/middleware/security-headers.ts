// Content Security Policy — production only (so it never interferes with Vite's
// dev HMR websocket / eval). 'unsafe-inline' is required for Nuxt's inline
// hydration script and Vuetify's inline styles; we deliberately OMIT
// 'unsafe-eval'. The real protections: object-src none, frame-ancestors none,
// base-uri self, connect-src self (blocks exfiltration to other origins),
// upgrade-insecure-requests (forces HTTPS, defeats downgrade/interception).
// jsdelivr is allowed only for the gated Swagger UI at /docs.
// Escape hatch: set DISABLE_CSP=true in the environment if it ever breaks prod.
const CSP = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
].join("; ");

export default defineEventHandler((event) => {
    setResponseHeader(event, "X-DNS-Prefetch-Control", "off");
    setResponseHeader(event, "X-Download-Options", "noopen");
    setResponseHeader(event, "X-Permitted-Cross-Domain-Policies", "none");
    setResponseHeader(event, "Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    setResponseHeader(event, "Cross-Origin-Resource-Policy", "same-origin");
    setResponseHeader(event, "Cross-Origin-Opener-Policy", "same-origin");

    if (!import.meta.dev && process.env.DISABLE_CSP !== "true") {
        setResponseHeader(event, "Content-Security-Policy", CSP);
    }
});
