import { ObjectId } from "mongodb";
import { requirePermission } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { sanitizeMongoInput } from "#server/utils/validators";
import { DIETS_COLLECTION, buildDietDoc } from "#server/utils/diet-helpers";

// Create a diet plan. diet.edit = nutritionist + admin only.
export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "diet.edit");

    const body = sanitizeMongoInput(await readBody<Record<string, unknown>>(event));

    const db = await getDatabase();
    // Author display name for the "criada por" label on the diet card.
    const author = await db
        .collection("users")
        .findOne({ _id: new ObjectId(ctx.userId) }, { projection: { name: 1 } });

    const doc = buildDietDoc(body, {
        userId: ctx.userId,
        name: (author?.name as string) || ctx.email,
    });

    const res = await db.collection(DIETS_COLLECTION).insertOne(doc as never);
    return { success: true, dietId: res.insertedId.toString() };
});
