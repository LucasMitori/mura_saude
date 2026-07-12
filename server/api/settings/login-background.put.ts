import { Binary } from "mongodb";
import { requireAdmin } from "#server/utils/roles";
import { sanitizeMongoInput } from "#server/utils/validators";
import { getDatabase } from "#server/utils/mongodb";
import { decodeAndValidateImage } from "#server/utils/meal-images";
import {
    APP_SETTINGS_COLLECTION,
    LOGIN_BACKGROUND_ID,
    type LoginBackgroundDoc,
} from "#server/utils/app-settings";

interface SetBackgroundBody {
    dataUrl: string;
}

// Admin-only: set/replace the login page background. Same validation as meal
// photos (JPEG/PNG/WebP, 5 MB, magic bytes) but stored WITHOUT any TTL — this
// image is never auto-deleted.
export default defineEventHandler(async (event) => {
    const ctx = await requireAdmin(event);

    const rawBody = await readBody<SetBackgroundBody>(event);
    const body = sanitizeMongoInput(rawBody);
    const image = decodeAndValidateImage(body.dataUrl);

    const db = await getDatabase();
    const doc: LoginBackgroundDoc = {
        _id: LOGIN_BACKGROUND_ID,
        contentType: image.contentType,
        size: image.size,
        data: new Binary(image.buffer),
        updatedAt: new Date(),
        updatedBy: ctx.email,
    };
    await db
        .collection<LoginBackgroundDoc>(APP_SETTINGS_COLLECTION)
        .replaceOne({ _id: LOGIN_BACKGROUND_ID }, doc, { upsert: true });

    return { success: true, size: image.size, contentType: image.contentType };
});
