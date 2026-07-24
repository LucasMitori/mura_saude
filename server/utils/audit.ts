import type { H3Event } from "h3";
import { getDatabase } from "#server/utils/mongodb";

// Tamper-evident-ish trail of who touched sensitive things. This is a medical
// app: knowing which professional opened which exam document, and when, is the
// accountability layer that access control alone cannot provide.
export const AUDIT_COLLECTION = "auditLog";

// Entries self-destruct after 180 days (MongoDB TTL) so the log cannot grow
// unbounded and old personal data does not linger forever.
const AUDIT_TTL_DAYS = 180;

export type AuditAction =
    | "auth.login.success"
    | "auth.login.failed"
    | "auth.login.locked"
    | "auth.logoutAll"
    | "auth.passwordChanged"
    | "exam.upload"
    | "exam.view"
    | "exam.download"
    | "exam.update"
    | "exam.delete"
    | "admin.roleChanged"
    | "admin.privacyChanged";

export interface AuditActor {
    userId?: string | null;
    email?: string | null;
    role?: string | null;
}

let indexesEnsured = false;

async function ensureAuditIndexes(): Promise<void> {
    if (indexesEnsured) return;
    const db = await getDatabase();
    const col = db.collection(AUDIT_COLLECTION);
    await col
        .createIndex({ at: 1 }, { expireAfterSeconds: AUDIT_TTL_DAYS * 24 * 60 * 60 })
        .catch(() => {});
    await col.createIndex({ at: -1 }).catch(() => {});
    await col.createIndex({ action: 1, at: -1 }).catch(() => {});
    indexesEnsured = true;
}

/** Best-effort client IP (behind a proxy the first X-Forwarded-For hop). */
function clientIp(event: H3Event): string {
    const fwd = getHeader(event, "x-forwarded-for") || getHeader(event, "x-real-ip") || "";
    return (
        (fwd.split(",")[0] || "").trim() ||
        event.node.req.socket?.remoteAddress ||
        "unknown"
    );
}

/**
 * Record an audit entry. NEVER throws — an audit failure must not break the
 * user-facing operation, so errors are swallowed (and logged to stderr).
 * Only non-sensitive descriptors go in `details` (ids, titles, filenames) —
 * never file contents, passwords or tokens.
 */
export async function writeAudit(
    event: H3Event,
    actor: AuditActor,
    action: AuditAction,
    details: Record<string, unknown> = {},
): Promise<void> {
    try {
        await ensureAuditIndexes();
        const db = await getDatabase();
        await db.collection(AUDIT_COLLECTION).insertOne({
            at: new Date(),
            action,
            userId: actor.userId ?? null,
            email: actor.email ?? null,
            role: actor.role ?? null,
            ip: clientIp(event),
            userAgent: (getHeader(event, "user-agent") || "").slice(0, 200),
            details,
        });
    } catch (err) {
        console.error("[audit] failed to record", action, (err as Error)?.message);
    }
}
