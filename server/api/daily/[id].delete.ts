import { getDatabase } from "#server/utils/mongodb";
import { requirePermission, getDataOwnerId, toObjectIdOrThrow } from "#server/utils/roles";
import { deleteMealImagesByIds } from "#server/utils/meal-images";

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

    // Look up the record first so the day's meal photos can be cleaned up too.
    const rec = await collection.findOne(
        { _id: oid, userId },
        { projection: { meals: 1 } },
    );
    if (!rec) {
        throw createError({ statusCode: 404, message: "Record not found" });
    }

    const imageIds = ((rec.meals as Array<{ image?: { id?: string } | null }>) || [])
        .map((m) => m?.image?.id)
        .filter((id): id is string => !!id);
    if (imageIds.length > 0) {
        await deleteMealImagesByIds(imageIds);
    }

    const result = await collection.deleteOne({ _id: oid, userId });
    if (result.deletedCount === 0) {
        throw createError({ statusCode: 404, message: "Record not found" });
    }

    return { success: true };
});
