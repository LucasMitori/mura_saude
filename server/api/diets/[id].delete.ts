import { requirePermission, toObjectIdOrThrow } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { DIETS_COLLECTION } from "#server/utils/diet-helpers";

// Delete a diet plan. diet.edit = nutritionist + admin only — deleting diets
// is inside the nutritionist's own domain (never patient data).
export default defineEventHandler(async (event) => {
    await requirePermission(event, "diet.edit");
    const oid = toObjectIdOrThrow(getRouterParam(event, "id") || "");

    const db = await getDatabase();
    const res = await db.collection(DIETS_COLLECTION).deleteOne({ _id: oid });
    if (res.deletedCount === 0) {
        throw createError({ statusCode: 404, message: "Dieta não encontrada" });
    }
    return { success: true };
});
