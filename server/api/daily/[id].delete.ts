import { getDatabase } from "#server/utils/mongodb";
import { requireAdmin } from "#server/utils/roles";
import { ObjectId } from "mongodb";

export default defineEventHandler(async (event) => {
    const { userId } = await requireAdmin(event);

    const id = getRouterParam(event, "id");
    if (!id) {
        throw createError({ statusCode: 400, message: "ID is required" });
    }

    const db = await getDatabase();
    const collection = db.collection("dailyRecords");

    const result = await collection.deleteOne({
        _id: new ObjectId(id),
        userId,
    });

    if (result.deletedCount === 0) {
        throw createError({ statusCode: 404, message: "Record not found" });
    }

    return { success: true };
});
