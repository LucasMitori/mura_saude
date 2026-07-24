import { requireAdmin } from "#server/utils/roles";
import { sanitizeMongoInput } from "#server/utils/validators";
import { getDatabase } from "#server/utils/mongodb";
import { APP_SETTINGS_COLLECTION, PRIVACY_ID } from "#server/utils/app-settings";
import { writeAudit } from "#server/utils/audit";

interface PrivacyBody {
    hideWeight?: unknown;
}

// Admin-only: toggle whether the patient's weight is hidden from plain viewers.
export default defineEventHandler(async (event) => {
    const ctx = await requireAdmin(event);
    const body = sanitizeMongoInput(await readBody<PrivacyBody>(event));
    const hideWeight = body?.hideWeight === true;

    const db = await getDatabase();
    await db.collection(APP_SETTINGS_COLLECTION).updateOne(
        { _id: PRIVACY_ID as never },
        { $set: { hideWeight, updatedAt: new Date(), updatedBy: ctx.email } },
        { upsert: true },
    );

    await writeAudit(
        event,
        { userId: ctx.userId, email: ctx.email, role: ctx.role },
        "admin.privacyChanged",
        { hideWeight },
    );

    return { success: true, hideWeight };
});
