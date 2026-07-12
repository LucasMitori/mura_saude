import { Binary } from "mongodb";
import { requirePermission, toObjectIdOrThrow } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { MEAL_IMAGES_COLLECTION, type MealImageDoc } from "#server/utils/meal-images";

// Serve one meal photo (binary). Any authenticated viewer can see it — same
// visibility as the meal data itself. 404 here + an old `uploadedAt` on the
// meal ref is how the client detects "expired after 30 days".
export default defineEventHandler(async (event) => {
    await requirePermission(event, "nutrition.view");

    const id = getRouterParam(event, "id");
    const oid = toObjectIdOrThrow(id || "");

    const db = await getDatabase();
    const doc = await db
        .collection<MealImageDoc>(MEAL_IMAGES_COLLECTION)
        .findOne({ _id: oid });

    if (!doc) {
        throw createError({
            statusCode: 404,
            message: "Imagem não encontrada ou expirada",
        });
    }

    setHeader(event, "Content-Type", doc.contentType);
    setHeader(event, "Content-Length", doc.size);
    // Immutable content — a photo is never edited in place, only replaced under
    // a new id, so the browser can cache it for the session.
    setHeader(event, "Cache-Control", "private, max-age=3600");
    const data = doc.data instanceof Binary ? doc.data.buffer : doc.data;
    return Buffer.from(data as Uint8Array);
});
