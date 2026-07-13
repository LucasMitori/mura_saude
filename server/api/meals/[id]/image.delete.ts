import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import { getDatabase } from "#server/utils/mongodb";
import { getOrCreateDailyRecord } from "#server/utils/daily-helpers";
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
    // Positional $set clears only this meal's image ref — no array rewrite.
    const db = await getDatabase();
    await db.collection("dailyRecords").updateOne(
        { userId, date: body.date, "meals.id": mealId },
        { $set: { "meals.$.image": null, updatedAt: new Date().toISOString() } },
    );

    return { success: true };
});
