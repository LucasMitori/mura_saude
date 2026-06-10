import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import {
    ensureDailyRecordsIndexes,
    emptyDailyRecord,
    persistDailyRecord,
    recomputeMealTotals,
    recomputeWorkoutTotals,
    recomputeDailySummary,
    generateSubId,
    type DailyRecordDoc,
    type MealLite,
    type BodyMeasurementEntryLite,
    type WorkoutLite,
} from "#server/utils/daily-helpers";

interface CreateDailyBody {
    date: string;
    caloricGoal?: number;
    waterGoal?: { value: number; unit: "l" | "ml" };
    bodyMeasurements?: BodyMeasurementEntryLite[];
    meals?: MealLite[];
    workout?: WorkoutLite | null;
    water?: {
        intake: { value: number; unit: "l" | "ml" };
        goal: { value: number; unit: "l" | "ml" };
    };
    notes?: string;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);
    await ensureDailyRecordsIndexes();

    const rawBody = await readBody<CreateDailyBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date, caloricGoal, waterGoal, bodyMeasurements, meals, workout, water, notes } = body;

    validateRequired(date, "date");
    validateDate(date);

    const rec: DailyRecordDoc = emptyDailyRecord(
        userId,
        date,
        waterGoal || (water?.goal as { value: number; unit: "l" | "ml" }),
        caloricGoal,
    );

    rec.bodyMeasurements = (bodyMeasurements || []).map((m) => ({
        ...m,
        id: m.id || generateSubId(),
        timestamp: m.timestamp || new Date().toISOString(),
    }));

    rec.meals = (meals || []).map((m) => {
        const meal: MealLite = {
            ...m,
            id: m.id || generateSubId(),
            foods: m.foods || [],
            totalCalories: 0,
            totalWeight: 0,
        };
        recomputeMealTotals(meal);
        return meal;
    });

    if (workout) {
        const w: WorkoutLite = { ...workout, id: workout.id || generateSubId() };
        recomputeWorkoutTotals(w);
        rec.workout = w;
    } else {
        rec.workout = null;
    }

    if (water) {
        rec.water = water;
    }

    rec.notes = (typeof notes === "string" ? notes : "").slice(0, 5000);
    recomputeDailySummary(rec);

    await persistDailyRecord(rec);

    return { success: true, date };
});
