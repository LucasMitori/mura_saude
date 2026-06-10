import { requirePermission, toObjectIdOrThrow } from "#server/utils/roles";
import { routinesCollection } from "#server/utils/routine-helpers";

// POST /api/routines/:id/archive  body: { archived: boolean }
// Archive (or restore) a routine. Requires `treinos.archive` — personal trainers
// can archive but NOT delete (delete is admin-only via the DELETE endpoint).
export default defineEventHandler(async (event) => {
    await requirePermission(event, "treinos.archive");
    const id = toObjectIdOrThrow(getRouterParam(event, "id") || "");

    const body = await readBody<{ archived?: unknown }>(event);
    const archived = body?.archived !== false; // default to archiving

    const col = await routinesCollection();
    const result = await col.updateOne(
        { _id: id },
        { $set: { archived, updatedAt: new Date().toISOString() } },
    );
    if (result.matchedCount === 0) {
        throw createError({ statusCode: 404, message: "Rotina não encontrada" });
    }
    return { success: true, archived };
});
