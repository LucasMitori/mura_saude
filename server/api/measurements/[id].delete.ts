import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
    recomputeDailySummary,
} from "#server/utils/daily-helpers";

interface DeleteMeasurementBody {
    date: string;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const id = getRouterParam(event, "id");
    if (!id) throw createError({ statusCode: 400, message: "Measurement id is required" });

    const rawBody = await readBody<DeleteMeasurementBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date } = body;

    validateRequired(date, "date");
    validateDate(date);

    const rec = await getOrCreateDailyRecord(userId, date);
    const before = rec.bodyMeasurements.length;
    rec.bodyMeasurements = rec.bodyMeasurements.filter((m) => m.id !== id);
    if (rec.bodyMeasurements.length === before) {
        throw createError({ statusCode: 404, message: "Measurement not found" });
    }
    recomputeDailySummary(rec);
    await persistDailyRecord(rec);

    return { success: true };
});
