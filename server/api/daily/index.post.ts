import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import {
    validateRequired,
    validateDate,
    validateMealType,
    sanitizeMongoInput,
} from "#server/utils/validators";
import { deleteMealImagesForDate } from "#server/utils/meal-images";
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

    // Explicit field mapping — never spread client input into the document.
    // Note the absence of `image`: photos are attached ONLY through
    // POST /api/meals/:id/image, so a bulk save cannot carry or forge a ref.
    rec.meals = (meals || []).map((m) => {
        if (!validateMealType(m?.type)) {
            throw createError({ statusCode: 400, message: "Invalid meal type" });
        }
        const meal: MealLite = {
            id: typeof m.id === "string" && m.id ? m.id : generateSubId(),
            type: m.type,
            label: typeof m.label === "string" ? m.label.slice(0, 300) : "",
            time: typeof m.time === "string" ? m.time.slice(0, 5) : "",
            notes: typeof m.notes === "string" ? m.notes.slice(0, 2000) : "",
            foods: (Array.isArray(m.foods) ? m.foods : []).map((f) => ({
                name: String(f?.name || "").slice(0, 300),
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

    // This endpoint REPLACES the whole day. Any photos belonging to the
    // previous version of this day would orphan in the gallery — remove them.
    await deleteMealImagesForDate(userId, date);

    await persistDailyRecord(rec);

    return { success: true, date };
});
