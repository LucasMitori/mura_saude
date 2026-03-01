import { getDatabase } from "#server/utils/mongodb";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const { userId, date, from, to } = query as {
        userId?: string;
        date?: string;
        from?: string;
        to?: string;
    };

    if (!userId) {
        throw createError({ statusCode: 400, message: "userId is required" });
    }

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    // Single date lookup
    if (date) {
        const record = await collection.findOne({ userId, date });
        if (!record) {
            throw createError({ statusCode: 404, message: "Record not found" });
        }
        return record;
    }

    // Date range lookup
    const filter: Record<string, unknown> = { userId };
    if (from || to) {
        filter.date = {};
        if (from) (filter.date as Record<string, string>).$gte = from;
        if (to) (filter.date as Record<string, string>).$lte = to;
    }

    const records = await collection
        .find(filter)
        .sort({ date: -1 })
        .limit(30)
        .toArray();

    return records;
});
