import { requireAdmin } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import {
    APP_SETTINGS_COLLECTION,
    LOGIN_BACKGROUND_ID,
} from "#server/utils/app-settings";

// Admin-only: remove the login background (reverts to the plain theme).
export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const db = await getDatabase();
    const res = await db
        .collection(APP_SETTINGS_COLLECTION)
        .deleteOne({ _id: LOGIN_BACKGROUND_ID as never });

    if (res.deletedCount === 0) {
        throw createError({ statusCode: 404, message: "No login background set" });
    }
    return { success: true };
});
