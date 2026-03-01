import { getDatabase } from "#server/utils/mongodb";
import { requireAdmin } from "#server/utils/roles";
import { validateRequired, validateMealType } from "#server/utils/validators";

interface AddMealBody {
    date: string;
    meal: {
        type: string;
        name: string;
        ingredients: Array<{
            name: string;
            grams: number;
            calories: number;
            protein?: number;
            carbs?: number;
            fats?: number;
        }>;
    };
}

export default defineEventHandler(async (event) => {
    const { userId } = await requireAdmin(event);

    const body = await readBody<AddMealBody>(event);
    const { date, meal } = body;

    validateRequired(date, "date");
    validateRequired(meal, "meal");
    validateRequired(meal.type, "meal.type");
    validateRequired(meal.name, "meal.name");

    if (!validateMealType(meal.type)) {
        throw createError({ statusCode: 400, message: "Invalid meal type" });
    }

    if (!Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
        throw createError({
            statusCode: 400,
            message: "Meal must have at least one ingredient",
        });
    }

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const result = await collection.updateOne({ userId, date }, {
        $push: { meals: meal as unknown } as Record<string, unknown>,
        $set: { updatedAt: new Date() },
    } as any);

    if (result.matchedCount === 0) {
        throw createError({
            statusCode: 404,
            message: "Daily record not found. Create it first.",
        });
    }

    return { success: true };
});
