import { getDatabase } from "#server/utils/mongodb";
import { requirePermission, getDataOwnerId, toObjectIdOrThrow } from "#server/utils/roles";

export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const id = getRouterParam(event, "id");
    if (!id) {
        throw createError({ statusCode: 400, message: "ID is required" });
    }
    const oid = toObjectIdOrThrow(id);

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const result = await collection.deleteOne({ _id: oid, userId });

    if (result.deletedCount === 0) {
        throw createError({ statusCode: 404, message: "Record not found" });
    }

    return { success: true };
});
