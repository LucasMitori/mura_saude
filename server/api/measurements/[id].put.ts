import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
    recomputeDailySummary,
    type BodyMeasurementEntryLite,
} from "#server/utils/daily-helpers";

interface UpdateMeasurementBody {
    date: string;
    measurement: Partial<BodyMeasurementEntryLite>;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const id = getRouterParam(event, "id");
    if (!id) throw createError({ statusCode: 400, message: "Measurement id is required" });

    const rawBody = await readBody<UpdateMeasurementBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date, measurement } = body;

    validateRequired(date, "date");
    validateDate(date);
    validateRequired(measurement, "measurement");

    const rec = await getOrCreateDailyRecord(userId, date);
    const idx = rec.bodyMeasurements.findIndex((m) => m.id === id);
    if (idx < 0) {
        throw createError({ statusCode: 404, message: "Measurement not found" });
    }

    const existing = rec.bodyMeasurements[idx]!;
    rec.bodyMeasurements[idx] = {
        ...existing,
        time: measurement.time === "evening" ? "evening" : measurement.time === "morning" ? "morning" : existing.time,
        timestamp: measurement.timestamp || existing.timestamp,
        data: (measurement.data || existing.data) as Record<string, unknown>,
    };

    recomputeDailySummary(rec);
    await persistDailyRecord(rec);

    return { success: true };
});
