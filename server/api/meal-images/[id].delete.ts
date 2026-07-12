import { requireAdmin, toObjectIdOrThrow } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { MEAL_IMAGES_COLLECTION, type MealImageDoc } from "#server/utils/meal-images";

// Admin-only delete from the gallery (e.g. to free database space). Also clears
// the ref on the owning meal so the meal card shows no image (and no expiry
// message) — an intentional admin deletion is not a TTL expiry.
export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const id = getRouterParam(event, "id");
    const oid = toObjectIdOrThrow(id || "");

    const db = await getDatabase();
    const col = db.collection<MealImageDoc>(MEAL_IMAGES_COLLECTION);

    const doc = await col.findOne(
        { _id: oid },
        { projection: { data: 0 } },
    );
    if (!doc) {
        throw createError({ statusCode: 404, message: "Imagem não encontrada" });
    }

    await col.deleteOne({ _id: oid });

    // Best-effort ref cleanup on the daily record.
    await db.collection("dailyRecords").updateOne(
        { userId: doc.userId, date: doc.date, "meals.id": doc.mealId },
        { $set: { "meals.$.image": null, updatedAt: new Date().toISOString() } },
    );

    return { success: true, freedBytes: doc.size };
});
