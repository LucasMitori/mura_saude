import { getDatabase } from "#server/utils/mongodb";
import { requireAdmin } from "#server/utils/roles";
import { validateRequired, validateDate } from "#server/utils/validators";

interface CreateDailyBody {
    date: string;
    caloricGoal: number;
    waterGoal: { value: number; unit: string };
    bodyMeasurements: unknown[];
    meals: unknown[];
    workout: unknown | null;
    water: {
        intake: { value: number; unit: string };
        goal: { value: number; unit: string };
    };
    summary: Record<string, unknown>;
    notes: string;
}

export default defineEventHandler(async (event) => {
    const { userId } = await requireAdmin(event);

    const body = await readBody<CreateDailyBody>(event);
    const {
        date,
        caloricGoal,
        waterGoal,
        bodyMeasurements,
        meals,
        workout,
        water,
        summary,
        notes,
    } = body;

    validateRequired(date, "date");
    validateDate(date);

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    await collection
        .createIndex({ userId: 1, date: 1 }, { unique: true })
        .catch(() => {});

    const now = new Date().toISOString();

    const recordData = {
        userId,
        date,
        bodyMeasurements: bodyMeasurements || [],
        meals: meals || [],
        workout: workout || null,
        water: water || {
            intake: { value: 0, unit: waterGoal?.unit || "l" },
            goal: waterGoal || { value: 3, unit: "l" },
        },
        caloricGoal: caloricGoal || 2000,
        summary: summary || {},
        notes: notes || "",
        updatedAt: now,
    };

    const result = await collection.updateOne(
        { userId, date },
        {
            $set: recordData,
            $setOnInsert: { createdAt: now },
        },
        { upsert: true },
    );

    const action = result.upsertedCount > 0 ? "created" : "updated";

    return { success: true, date, action };
});
