import { getDatabase } from "#server/utils/mongodb";
import { requireAdmin } from "#server/utils/roles";
import { ObjectId } from "mongodb";

interface UpdateDailyBody {
    bodyMeasurement?: unknown;
    workout?: unknown;
    notes?: string;
}

export default defineEventHandler(async (event) => {
    const { userId } = await requireAdmin(event);

    const id = getRouterParam(event, "id");
    if (!id) {
        throw createError({ statusCode: 400, message: "ID is required" });
    }

    const body = await readBody<UpdateDailyBody>(event);
    const { bodyMeasurement, workout, notes } = body;

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (bodyMeasurement !== undefined)
        updateFields.bodyMeasurement = bodyMeasurement;
    if (workout !== undefined) updateFields.workout = workout;
    if (notes !== undefined) updateFields.notes = notes;

    const result = await collection.updateOne(
        { _id: new ObjectId(id), userId },
        { $set: updateFields },
    );

    if (result.matchedCount === 0) {
        throw createError({ statusCode: 404, message: "Record not found" });
    }

    return { success: true };
});
