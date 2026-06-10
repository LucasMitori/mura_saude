import { getDatabase } from "#server/utils/mongodb";
import { getAuthUser } from "#server/utils/auth";
import { getAdminUserId } from "#server/utils/roles";
import { safeDateQueryParam } from "#server/utils/validators";

export default defineEventHandler(async (event) => {
    const auth = getAuthUser(event);

    const query = getQuery(event);
    const date = safeDateQueryParam(query.date);
    const from = safeDateQueryParam(query.from);
    const to = safeDateQueryParam(query.to);
    const limitRaw = typeof query.limit === "string" ? parseInt(query.limit, 10) : 60;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 365) : 60;

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const adminUserId = await getAdminUserId();
    const targetUserId = adminUserId || auth.userId;

    if (date) {
        const record = await collection.findOne({ userId: targetUserId, date });
        if (!record) {
            throw createError({ statusCode: 404, message: "Record not found" });
        }
        return { ...record, _id: record._id.toString() };
    }

    const filter: Record<string, unknown> = { userId: targetUserId };
    if (from || to) {
        const range: Record<string, string> = {};
        if (from) range.$gte = from;
        if (to) range.$lte = to;
        filter.date = range;
    }

    const records = await collection
        .find(filter)
        .sort({ date: -1 })
        .limit(limit)
        .toArray();

    return records.map((r) => ({ ...r, _id: r._id.toString() }));
});
