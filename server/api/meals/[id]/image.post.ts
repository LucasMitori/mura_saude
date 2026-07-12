import { Binary } from "mongodb";
import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { validateRequired, validateDate, sanitizeMongoInput } from "#server/utils/validators";
import { getDatabase } from "#server/utils/mongodb";
import {
    getOrCreateDailyRecord,
    persistDailyRecord,
} from "#server/utils/daily-helpers";
import {
    MEAL_IMAGES_COLLECTION,
    ensureMealImageIndexes,
    decodeAndValidateImage,
    deleteMealImagesByIds,
    type MealImageDoc,
} from "#server/utils/meal-images";

interface UploadImageBody {
    date: string;
    dataUrl: string;
}

// Attach (or replace) the photo of one meal. Max 5 MB; JPEG/PNG/WebP only.
// The binary is stored in `mealImages` with a 30-day TTL; the meal keeps a
// { id, uploadedAt } ref that survives expiry.
export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "nutrition.edit");
    const userId = await getDataOwnerId(ctx);

    const mealId = getRouterParam(event, "id");
    if (!mealId) {
        throw createError({ statusCode: 400, message: "Meal id is required" });
    }

    const rawBody = await readBody<UploadImageBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const { date, dataUrl } = body;

    validateRequired(date, "date");
    validateDate(date);
    const image = decodeAndValidateImage(dataUrl);

    const rec = await getOrCreateDailyRecord(userId, date);
    const meal = rec.meals.find((m) => m.id === mealId);
    if (!meal) {
        throw createError({ statusCode: 404, message: "Meal not found" });
    }

    const db = await getDatabase();
    await ensureMealImageIndexes(db);

    // Replacing an existing photo? Remove the old binary first.
    if (meal.image?.id) {
        await deleteMealImagesByIds([meal.image.id]);
    }

    const now = new Date();
    const doc: MealImageDoc = {
        userId,
        date,
        mealId,
        mealType: meal.type,
        mealLabel: meal.label || "",
        mealTime: meal.time || "",
        contentType: image.contentType,
        size: image.size,
        data: new Binary(image.buffer),
        createdAt: now,
    };
    const inserted = await db
        .collection<MealImageDoc>(MEAL_IMAGES_COLLECTION)
        .insertOne(doc);

    meal.image = { id: inserted.insertedId.toString(), uploadedAt: now.toISOString() };
    await persistDailyRecord(rec);

    return { success: true, imageId: meal.image.id, uploadedAt: meal.image.uploadedAt };
});
