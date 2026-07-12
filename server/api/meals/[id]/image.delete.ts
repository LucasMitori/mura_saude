import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
} from "#server/utils/daily-helpers";
import { deleteMealImagesByIds } from "#server/utils/meal-images";

interface DeleteImageBody {
    date: string;
}

// Editor-initiated removal of a meal's photo: deletes the binary AND clears
// the ref (unlike TTL expiry, which leaves the ref so the UI can explain it).
export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const mealId = getRouterParam(event, "id");
    if (!mealId) {
        throw createError({ statusCode: 400, message: "Meal id is required" });
    }

    const rawBody = await readBody<DeleteImageBody>(event);
    const body = sanitizeMongoInput(rawBody);
    validateRequired(body.date, "date");
    validateDate(body.date);

    const rec = await getOrCreateDailyRecord(userId, body.date);
    const meal = rec.meals.find((m) => m.id === mealId);
    if (!meal) {
        throw createError({ statusCode: 404, message: "Meal not found" });
    }
    if (!meal.image?.id) {
        throw createError({ statusCode: 404, message: "Meal has no image" });
    }

    await deleteMealImagesByIds([meal.image.id]);
    meal.image = null;
    await persistDailyRecord(rec);

    return { success: true };
});
