import { getDatabase } from "#server/utils/mongodb";
import { requirePermission, getDataOwnerId, toObjectIdOrThrow } from "#server/utils/roles";
import { sanitizeMongoInput, validateString } from "#server/utils/validators";

interface UpdateDailyBody {
    notes?: string;
    caloricGoal?: number;
}

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const id = getRouterParam(event, "id");
    if (!id) {
        throw createError({ statusCode: 400, message: "ID is required" });
    }
    const oid = toObjectIdOrThrow(id);

    const rawBody = await readBody<UpdateDailyBody>(event);
    const body = sanitizeMongoInput(rawBody);

    const updateFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.notes === "string") {
        updateFields.notes = validateString(body.notes, "notes", 5000);
    }
    if (typeof body.caloricGoal === "number" && Number.isFinite(body.caloricGoal)) {
        updateFields.caloricGoal = Math.max(0, Math.min(10000, body.caloricGoal));
    }

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const result = await collection.updateOne(
        { _id: oid, userId },
        { $set: updateFields },
    );

    if (result.matchedCount === 0) {
        throw createError({ statusCode: 404, message: "Record not found" });
    }

    return { success: true };
});
