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
    const type = typeof query.type === "string" ? query.type : undefined;
    const search = typeof query.search === "string" ? query.search.trim().slice(0, 80) : "";

    const adminId = await getAdminUserId();
    const targetUserId = adminId || auth.userId;

    const db = await getDatabase();
    const col = db.collection("dailyRecords");

    const filter: Record<string, unknown> = { userId: targetUserId };
    if (date) filter.date = date;
    else if (from || to) {
        const range: Record<string, string> = {};
        if (from) range.$gte = from;
        if (to) range.$lte = to;
        filter.date = range;
    }

    const records = await col
        .find(filter)
        .project({ date: 1, meals: 1 })
        .sort({ date: -1 })
        .limit(180)
        .toArray();

    const out: Array<{
        date: string;
        meal: Record<string, unknown>;
    }> = [];

    for (const r of records) {
        const meals = (r.meals || []) as Array<Record<string, unknown>>;
        for (const m of meals) {
            if (type && m.type !== type) continue;
            if (search) {
                const lowerSearch = search.toLowerCase();
                const matchesLabel = String(m.label || "").toLowerCase().includes(lowerSearch);
                const foods = (m.foods || []) as Array<{ name?: string }>;
                const matchesFood = foods.some((f) =>
                    String(f?.name || "").toLowerCase().includes(lowerSearch),
                );
                if (!matchesLabel && !matchesFood) continue;
            }
            out.push({ date: r.date as string, meal: m });
        }
    }

    return out;
});
