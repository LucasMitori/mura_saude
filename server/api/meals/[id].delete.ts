import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import { getDatabase } from "#server/utils/mongodb";
import {
    getOrCreateDailyRecord,
    recomputeSummaryAtomic,
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
    const removed = rec.meals.find((m) => m.id === id);
    if (!removed) {
        throw createError({ statusCode: 404, message: "Meal not found" });
    }
    // Don't orphan the meal's photo binary in mealImages.
    if (removed.image?.id) {
        await deleteMealImagesByIds([removed.image.id]);
    }

    // Atomic $pull removes only this meal — concurrent adds on the same day
    // are never clobbered by a whole-array rewrite.
    const db = await getDatabase();
    await db.collection("dailyRecords").updateOne(
        { userId, date },
        { $pull: { meals: { id } as never } },
    );
    await recomputeSummaryAtomic(userId, date);

    return { success: true };
});
