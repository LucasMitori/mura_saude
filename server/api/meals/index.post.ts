import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import {
    validateRequired,
    validateDate,
    validateMealType,
    sanitizeMongoInput,
} from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    appendMealAndRecompute,
    recomputeMealTotals,
    generateSubId,
    type MealLite,
} from "#server/utils/daily-helpers";

interface AddMealBody {
    date: string;
    meal: Partial<MealLite>;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const rawBody = await readBody<AddMealBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date, meal } = body;

    validateRequired(date, "date");
    validateDate(date);
    validateRequired(meal, "meal");

    if (!validateMealType(meal.type)) {
        throw createError({ statusCode: 400, message: "Invalid meal type" });
    }

    if (!Array.isArray(meal.foods)) {
        throw createError({
            statusCode: 400,
            message: "Meal must include a foods array",
        });
    }

    // Ensure the day exists (concurrency-safe), then append atomically below.
    await getOrCreateDailyRecord(userId, date);

    const newMeal: MealLite = {
        id: generateSubId(),
        type: meal.type,
        label: (meal.label as string) || "",
        time: (meal.time as string) || "",
        notes: (meal.notes as string) || "",
        foods: meal.foods.map((f) => ({
            name: String(f?.name || ""),
            weightGrams: Number(f?.weightGrams) || 0,
            calories: Number(f?.calories) || 0,
            protein: f?.protein != null ? Number(f.protein) : undefined,
            carbs: f?.carbs != null ? Number(f.carbs) : undefined,
            fats: f?.fats != null ? Number(f.fats) : undefined,
            fiber: f?.fiber != null ? Number(f.fiber) : undefined,
        })),
        totalCalories: 0,
        totalWeight: 0,
    };
    recomputeMealTotals(newMeal);

    await appendMealAndRecompute(userId, date, newMeal);

    return { success: true, mealId: newMeal.id };
});
