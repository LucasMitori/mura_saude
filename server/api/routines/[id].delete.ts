import { requirePermission, toObjectIdOrThrow } from "#server/utils/roles";
import { routinesCollection } from "#server/utils/routine-helpers";

// DELETE /api/routines/:id — delete a routine (admin only).
export default defineEventHandler(async (event) => {
    await requirePermission(event, "treinos.delete");
    const id = toObjectIdOrThrow(getRouterParam(event, "id") || "");
    const col = await routinesCollection();
    await col.deleteOne({ _id: id });
    return { success: true };
});
