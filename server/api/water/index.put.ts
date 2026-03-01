import { getDatabase } from "#server/utils/mongodb";
import { requireAdmin } from "#server/utils/roles";
import {
    validateRequired,
    validatePositiveNumber,
} from "#server/utils/validators";

interface WaterBody {
    date: string;
    intake: number;
}

export default defineEventHandler(async (event) => {
    const { userId } = await requireAdmin(event);

    const body = await readBody<WaterBody>(event);
    const { date, intake } = body;

    validateRequired(date, "date");
    validatePositiveNumber(intake, "intake");

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const result = await collection.updateOne(
        { userId, date },
        { $set: { "water.intake.value": intake, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
        throw createError({
            statusCode: 404,
            message: "Daily record not found",
        });
    }

    return { success: true };
});
