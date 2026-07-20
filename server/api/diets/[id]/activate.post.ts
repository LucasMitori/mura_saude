import { requirePermission, toObjectIdOrThrow } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { sanitizeMongoInput } from "#server/utils/validators";
import { DIETS_COLLECTION } from "#server/utils/diet-helpers";

// Activate (or deactivate) a diet plan. At most ONE plan is active at a time —
// activating one deactivates all others. The active plan is what the
// dashboard shows as the patient's current diet.
export default defineEventHandler(async (event) => {
    await requirePermission(event, "diet.edit");
    const oid = toObjectIdOrThrow(getRouterParam(event, "id") || "");

    const body = sanitizeMongoInput(await readBody<{ active?: unknown }>(event));
    const active = body?.active === true;

    const db = await getDatabase();
    const col = db.collection(DIETS_COLLECTION);

    const target = await col.findOne({ _id: oid }, { projection: { _id: 1 } });
    if (!target) {
        throw createError({ statusCode: 404, message: "Dieta não encontrada" });
    }

    const now = new Date().toISOString();
    if (active) {
        await col.updateMany(
            { _id: { $ne: oid }, active: true },
            { $set: { active: false, updatedAt: now } },
        );
    }
    await col.updateOne({ _id: oid }, { $set: { active, updatedAt: now } });

    return { success: true, active };
});
