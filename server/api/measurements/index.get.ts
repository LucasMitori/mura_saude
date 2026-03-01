import { getDatabase } from "#server/utils/mongodb";
import { getAuthUser } from "#server/utils/auth";

export default defineEventHandler(async (event) => {
    const { userId } = getAuthUser(event);

    const query = getQuery(event);
    const {
        from,
        to,
        limit: limitStr,
    } = query as {
        from?: string;
        to?: string;
        limit?: string;
    };

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const adminUser = await db.collection("users").findOne({ role: "admin" });
    const targetUserId = adminUser ? adminUser._id.toString() : userId;

    const filter: Record<string, unknown> = {
        userId: targetUserId,
        bodyMeasurement: { $ne: null },
    };

    if (from || to) {
        filter.date = {};
        if (from) (filter.date as Record<string, string>).$gte = from;
        if (to) (filter.date as Record<string, string>).$lte = to;
    }

    const limit = limitStr ? parseInt(limitStr, 10) : 30;

    const records = await collection
        .find(filter)
        .project({ date: 1, bodyMeasurement: 1 })
        .sort({ date: -1 })
        .limit(limit)
        .toArray();

    return records;
});
