import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import {
    validateRequired,
    validateDate,
    validatePositiveNumber,
    validateVolumeUnit,
    sanitizeMongoInput,
} from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
    recomputeDailySummary,
} from "#server/utils/daily-helpers";

interface WaterBody {
    date: string;
    intake?: number;
    addMl?: number;
    goal?: { value: number; unit: "l" | "ml" };
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const rawBody = await readBody<WaterBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date, intake, addMl, goal } = body;

    validateRequired(date, "date");
    validateDate(date);

    const rec = await getOrCreateDailyRecord(userId, date);

    if (goal && typeof goal === "object") {
        if (!validateVolumeUnit(goal.unit)) {
            throw createError({ statusCode: 400, message: "Invalid water goal unit" });
        }
        validatePositiveNumber(goal.value, "goal.value");
        rec.water.goal = { value: goal.value, unit: goal.unit };
        if (rec.water.intake.unit !== goal.unit) {
            rec.water.intake.unit = goal.unit;
        }
    }

    if (typeof intake === "number") {
        validatePositiveNumber(intake, "intake");
        rec.water.intake.value = Math.round(intake * 100) / 100;
    } else if (typeof addMl === "number" && addMl !== 0) {
        const unit = rec.water.intake.unit;
        const delta = unit === "l" ? addMl / 1000 : addMl;
        rec.water.intake.value = Math.max(
            0,
            Math.round((rec.water.intake.value + delta) * 100) / 100,
        );
    }

    recomputeDailySummary(rec);
    await persistDailyRecord(rec);

    return { success: true, water: rec.water };
});
