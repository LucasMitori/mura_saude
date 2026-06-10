import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
    recomputeWorkoutTotals,
    recomputeDailySummary,
    generateSubId,
    type WorkoutLite,
} from "#server/utils/daily-helpers";

interface WorkoutBody {
    date: string;
    workout: WorkoutLite | null;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const rawBody = await readBody<WorkoutBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date, workout } = body;

    validateRequired(date, "date");
    validateDate(date);

    const rec = await getOrCreateDailyRecord(userId, date);

    if (workout === null) {
        rec.workout = null;
    } else if (workout && typeof workout === "object") {
        const w: WorkoutLite = {
            id: workout.id || rec.workout?.id || generateSubId(),
            startTime: workout.startTime || "",
            endTime: workout.endTime || "",
            totalDurationMinutes: Number(workout.totalDurationMinutes) || 0,
            exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
            totalCaloriesBurned: 0,
            notes: workout.notes || "",
        };
        recomputeWorkoutTotals(w);
        rec.workout = w;
    }

    recomputeDailySummary(rec);
    await persistDailyRecord(rec);

    return { success: true, workout: rec.workout };
});
