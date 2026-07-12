import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
    recomputeDailySummary,
} from "#server/utils/daily-helpers";
import { deleteMealImagesByIds } from "#server/utils/meal-images";

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
    const removed = rec.meals.find((m) => m.id === id);
    rec.meals = rec.meals.filter((m) => m.id !== id);
    if (rec.meals.length === before) {
        throw createError({ statusCode: 404, message: "Meal not found" });
    }
    // Don't orphan the meal's photo binary in mealImages.
    if (removed?.image?.id) {
        await deleteMealImagesByIds([removed.image.id]);
    }
    recomputeDailySummary(rec);
    await persistDailyRecord(rec);

    return { success: true };
});
