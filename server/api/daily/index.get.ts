import { getDatabase } from "#server/utils/mongodb";
import { requirePermission, getAdminUserId } from "#server/utils/roles";
import { safeDateQueryParam } from "#server/utils/validators";
import { shouldHideWeight, redactWeight } from "#server/utils/privacy";

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "dashboard.view");
    // Plain viewers get the patient's weight redacted when the privacy toggle
    // is on. Resolved once server-side; the real value never reaches them.
    const hideWeight = await shouldHideWeight(ctx);

    const query = getQuery(event);
    const date = safeDateQueryParam(query.date);
    const from = safeDateQueryParam(query.from);
    const to = safeDateQueryParam(query.to);
    const limitRaw = typeof query.limit === "string" ? parseInt(query.limit, 10) : 60;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 365) : 60;
    // light=1 drops the per-food rows — the heaviest part of a range payload.
    // Dashboards only need summaries/counts; reports and the day view do not
    // pass it and keep receiving full documents.
    const light = query.light === "1" || query.light === "true";

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const adminUserId = await getAdminUserId();
    const targetUserId = adminUserId || ctx.userId;

    if (date) {
        const record = await collection.findOne({ userId: targetUserId, date });
        if (!record) {
            throw createError({ statusCode: 404, message: "Record not found" });
        }
        const out = { ...record, _id: record._id.toString() };
        return hideWeight ? redactWeight(out) : out;
    }

    const filter: Record<string, unknown> = { userId: targetUserId };
    if (from || to) {
        const range: Record<string, string> = {};
        if (from) range.$gte = from;
        if (to) range.$lte = to;
        filter.date = range;
    }

    const records = await collection
        .find(filter, light ? { projection: { "meals.foods": 0 } } : undefined)
        .sort({ date: -1 })
        .limit(limit)
        .toArray();

    return records.map((r) => {
        const out = { ...r, _id: r._id.toString() };
        return hideWeight ? redactWeight(out) : out;
    });
});
