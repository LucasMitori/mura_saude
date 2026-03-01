import { getDatabase } from "#server/utils/mongodb";
import { requireAdmin } from "#server/utils/roles";

interface DeleteMealBody {
    date: string;
    mealIndex: number;
}

export default defineEventHandler(async (event) => {
    const { userId } = await requireAdmin(event);

    const body = await readBody<DeleteMealBody>(event);
    const { date, mealIndex } = body;

    if (!date || mealIndex === undefined) {
        throw createError({
            statusCode: 400,
            message: "date and mealIndex are required",
        });
    }

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const record = await collection.findOne({ userId, date });
    if (!record) {
        throw createError({ statusCode: 404, message: "Record not found" });
    }

    const meals = record.meals as unknown[];
    if (mealIndex < 0 || mealIndex >= meals.length) {
        throw createError({ statusCode: 400, message: "Invalid meal index" });
    }

    meals.splice(mealIndex, 1);

    await collection.updateOne(
        { userId, date },
        { $set: { meals, updatedAt: new Date() } },
    );

    return { success: true };
});
