import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import {
    validateRequired,
    validateDate,
    validateMealType,
    sanitizeMongoInput,
} from "#server/utils/validators";
import { getDatabase } from "#server/utils/mongodb";
import {
    getOrCreateDailyRecord,
    recomputeMealTotals,
    recomputeSummaryAtomic,
    type MealLite,
} from "#server/utils/daily-helpers";

interface UpdateMealBody {
    date: string;
    meal: Partial<MealLite>;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const id = getRouterParam(event, "id");
    if (!id) throw createError({ statusCode: 400, message: "Meal id is required" });

    const rawBody = await readBody<UpdateMealBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date, meal } = body;

    validateRequired(date, "date");
    validateDate(date);
    validateRequired(meal, "meal");

    if (meal.type && !validateMealType(meal.type)) {
        throw createError({ statusCode: 400, message: "Invalid meal type" });
    }

    const rec = await getOrCreateDailyRecord(userId, date);
    const idx = rec.meals.findIndex((m) => m.id === id);
    if (idx < 0) {
        throw createError({ statusCode: 404, message: "Meal not found" });
    }

    const existing = rec.meals[idx]!;
    const updated: MealLite = {
        ...existing,
        type: (meal.type as string) || existing.type,
        label: typeof meal.label === "string" ? meal.label : existing.label,
        time: typeof meal.time === "string" ? meal.time : existing.time,
        notes: typeof meal.notes === "string" ? meal.notes : existing.notes,
        foods: Array.isArray(meal.foods)
            ? meal.foods.map((f) => ({
                  name: String(f?.name || ""),
                  weightGrams: Number(f?.weightGrams) || 0,
                  calories: Number(f?.calories) || 0,
                  protein: f?.protein != null ? Number(f.protein) : undefined,
                  carbs: f?.carbs != null ? Number(f.carbs) : undefined,
                  fats: f?.fats != null ? Number(f.fats) : undefined,
                  fiber: f?.fiber != null ? Number(f.fiber) : undefined,
              }))
            : existing.foods,
        totalCalories: 0,
        totalWeight: 0,
    };
    recomputeMealTotals(updated);

    // Positional $set touches only this one meal — a concurrent add on the
    // same day can never be overwritten by this edit.
    const db = await getDatabase();
    await db.collection("dailyRecords").updateOne(
        { userId, date, "meals.id": id },
        { $set: { "meals.$": updated as unknown as never } },
    );
    await recomputeSummaryAtomic(userId, date);

    return { success: true, meal: updated };
});
