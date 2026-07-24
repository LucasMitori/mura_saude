import { requireAdmin } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { AUDIT_COLLECTION } from "#server/utils/audit";

// Admin-only audit trail. Supports ?action=<exact> and ?limit=.
// Read-only by design: there is no endpoint to edit or delete entries — they
// expire on their own after 180 days via the TTL index.
export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const query = getQuery(event);
    const limitRaw = typeof query.limit === "string" ? parseInt(query.limit, 10) : 200;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 1000) : 200;

    const filter: Record<string, unknown> = {};
    if (typeof query.action === "string" && /^[a-zA-Z.]{1,40}$/.test(query.action)) {
        filter.action = query.action;
    }

    const db = await getDatabase();
    const entries = await db
        .collection(AUDIT_COLLECTION)
        .find(filter)
        .sort({ at: -1 })
        .limit(limit)
        .toArray();

    return entries.map((e) => ({
        id: e._id.toString(),
        at: e.at instanceof Date ? e.at.toISOString() : String(e.at),
        action: e.action as string,
        email: (e.email as string) || null,
        role: (e.role as string) || null,
        ip: (e.ip as string) || null,
        details: (e.details as Record<string, unknown>) || {},
    }));
});
