import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
    recomputeDailySummary,
} from "#server/utils/daily-helpers";

interface DeleteMealBody {
    date: string;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const id = getRouterParam(event, "id");
    if (!id) throw createError({ statusCode: 400, message: "Meal id is required" });

    const rawBody = await readBody<DeleteMealBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date } = body;

    validateRequired(date, "date");
    validateDate(date);

    const rec = await getOrCreateDailyRecord(userId, date);
    const before = rec.meals.length;
    rec.meals = rec.meals.filter((m) => m.id !== id);
    if (rec.meals.length === before) {
        throw createError({ statusCode: 404, message: "Meal not found" });
    }
    recomputeDailySummary(rec);
    await persistDailyRecord(rec);

    return { success: true };
});
