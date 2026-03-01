import { getDatabase } from "#server/utils/mongodb";
import {
    validateRequired,
    validateDate,
    validateVolumeUnit,
} from "#server/utils/validators";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { userId, date, waterGoal } = body;

    validateRequired(userId, "userId");
    validateRequired(date, "date");
    validateDate(date);
    validateRequired(waterGoal, "waterGoal");

    if (!validateVolumeUnit(waterGoal.unit)) {
        throw createError({ statusCode: 400, message: "Invalid water unit" });
    }

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const existing = await collection.findOne({ userId, date });
    if (existing) {
        throw createError({
            statusCode: 409,
            message: "Record already exists for this date",
        });
    }

    const now = new Date();
    const record = {
        userId,
        date,
        water: {
            intake: { value: 0, unit: waterGoal.unit },
            goal: waterGoal,
        },
        meals: [],
        bodyMeasurement: null,
        workout: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
    };

    await collection.insertOne(record);

    return { success: true, date };
});
