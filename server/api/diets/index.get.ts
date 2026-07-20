import { requirePermission } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { DIETS_COLLECTION } from "#server/utils/diet-helpers";

// List every diet plan — active first, then most recently updated.
// Any logged-in user can view (single-patient app); editing is diet.edit.
export default defineEventHandler(async (event) => {
    await requirePermission(event, "diet.view");

    const db = await getDatabase();
    const diets = await db
        .collection(DIETS_COLLECTION)
        .find({})
        .sort({ active: -1, updatedAt: -1 })
        .limit(100)
        .toArray();

    return diets.map((d) => ({ ...d, _id: d._id.toString() }));
});
