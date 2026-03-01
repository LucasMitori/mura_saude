import { getDatabase } from "#server/utils/mongodb";
import { getAuthUser } from "#server/utils/auth";

export default defineEventHandler(async (event) => {
    const { userId } = getAuthUser(event);

    const query = getQuery(event);
    const { date, from, to } = query as {
        date?: string;
        from?: string;
        to?: string;
    };

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    // For viewers, show admin's data (since only admin creates entries)
    // Find admin user ID
    const adminUser = await db.collection("users").findOne({ role: "admin" });
    const targetUserId = adminUser ? adminUser._id.toString() : userId;

    if (date) {
        const record = await collection.findOne({ userId: targetUserId, date });
        if (!record) {
            throw createError({ statusCode: 404, message: "Record not found" });
        }
        return { ...record, _id: record._id.toString() };
    }

    const filter: Record<string, unknown> = { userId: targetUserId };
    if (from || to) {
        filter.date = {};
        if (from) (filter.date as Record<string, string>).$gte = from;
        if (to) (filter.date as Record<string, string>).$lte = to;
    }

    const records = await collection
        .find(filter)
        .sort({ date: -1 })
        .limit(60)
        .toArray();

    return records.map((r) => ({ ...r, _id: r._id.toString() }));
});
