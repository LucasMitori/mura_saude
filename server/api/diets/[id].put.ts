import { requirePermission, toObjectIdOrThrow } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { sanitizeMongoInput } from "#server/utils/validators";
import { DIETS_COLLECTION, buildDietDoc, type DietDoc } from "#server/utils/diet-helpers";

// Update a diet plan. diet.edit = nutritionist + admin only.
// `active`/authorship/createdAt are preserved from the stored document —
// the body can never flip them.
export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "diet.edit");
    const oid = toObjectIdOrThrow(getRouterParam(event, "id") || "");

    const body = sanitizeMongoInput(await readBody<Record<string, unknown>>(event));

    const db = await getDatabase();
    const col = db.collection<DietDoc>(DIETS_COLLECTION);
    const existing = await col.findOne({ _id: oid } as never);
    if (!existing) {
        throw createError({ statusCode: 404, message: "Dieta não encontrada" });
    }

    const doc = buildDietDoc(
        body,
        { userId: ctx.userId, name: ctx.email },
        {
            active: existing.active,
            createdBy: existing.createdBy,
            createdByName: existing.createdByName,
            createdAt: existing.createdAt,
        },
    );

    await col.replaceOne({ _id: oid } as never, doc);
    return { success: true };
});
