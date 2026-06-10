import { getAuthUser } from "#server/utils/auth";
import { getAdminUserId } from "#server/utils/roles";
import { routinesCollection, ensureRoutineIndexes } from "#server/utils/routine-helpers";

// GET /api/routines — list routines (viewers read the admin's routines).
export default defineEventHandler(async (event) => {
    const auth = getAuthUser(event);
    await ensureRoutineIndexes();

    const adminId = await getAdminUserId();
    const targetUserId = adminId || auth.userId;

    const col = await routinesCollection();
    const routines = await col
        .find({ userId: targetUserId })
        .sort({ updatedAt: -1 })
        .limit(200)
        .toArray();

    return routines.map((r) => ({ ...r, _id: r._id?.toString() }));
});
