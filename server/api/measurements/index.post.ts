import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
    recomputeDailySummary,
    generateSubId,
    type BodyMeasurementEntryLite,
} from "#server/utils/daily-helpers";

interface MeasurementBody {
    date: string;
    measurement: Partial<BodyMeasurementEntryLite>;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const rawBody = await readBody<MeasurementBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date, measurement } = body;

    validateRequired(date, "date");
    validateDate(date);
    validateRequired(measurement, "measurement");

    const time = measurement.time === "evening" ? "evening" : "morning";

    const rec = await getOrCreateDailyRecord(userId, date);

    const entry: BodyMeasurementEntryLite = {
        id: generateSubId(),
        time,
        timestamp: measurement.timestamp || new Date().toISOString(),
        data: (measurement.data || {}) as Record<string, unknown>,
    };

    rec.bodyMeasurements.push(entry);
    recomputeDailySummary(rec);
    await persistDailyRecord(rec);

    return { success: true, measurementId: entry.id };
});
