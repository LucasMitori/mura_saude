import { getDatabase } from "#server/utils/mongodb";
import { requireAdmin } from "#server/utils/roles";
import { validateRequired, validateDate } from "#server/utils/validators";

interface MeasurementBody {
    date: string;
    bodyMeasurement: Record<string, unknown>;
}

export default defineEventHandler(async (event) => {
    const { userId } = await requireAdmin(event);

    const body = await readBody<MeasurementBody>(event);
    const { date, bodyMeasurement } = body;

    validateRequired(date, "date");
    validateDate(date);
    validateRequired(bodyMeasurement, "bodyMeasurement");

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const result = await collection.updateOne(
        { userId, date },
        { $set: { bodyMeasurement, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
        throw createError({
            statusCode: 404,
            message: "Daily record not found. Create it first.",
        });
    }

    return { success: true };
});
