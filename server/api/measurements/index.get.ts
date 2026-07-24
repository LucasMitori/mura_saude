import { getDatabase } from "#server/utils/mongodb";
import { requirePermission, getAdminUserId } from "#server/utils/roles";
import { safeDateQueryParam } from "#server/utils/validators";
import { shouldHideWeight, redactWeight } from "#server/utils/privacy";

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "dashboard.view");
    const hideWeight = await shouldHideWeight(ctx);

    const query = getQuery(event);
    const from = safeDateQueryParam(query.from);
    const to = safeDateQueryParam(query.to);
    const limitRaw = typeof query.limit === "string" ? parseInt(query.limit, 10) : 60;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 365) : 60;

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const adminId = await getAdminUserId();
    const targetUserId = adminId || ctx.userId;

    const filter: Record<string, unknown> = {
        userId: targetUserId,
        bodyMeasurements: { $exists: true, $ne: [] },
    };

    if (from || to) {
        const range: Record<string, string> = {};
        if (from) range.$gte = from;
        if (to) range.$lte = to;
        filter.date = range;
    }

    const records = await collection
        .find(filter)
        .project({ date: 1, bodyMeasurements: 1 })
        .sort({ date: -1 })
        .limit(limit)
        .toArray();

    return records.map((r) => {
        const out = {
            date: r.date as string,
            bodyMeasurements: r.bodyMeasurements || [],
        };
        return hideWeight ? redactWeight(out) : out;
    });
});
