import { requirePermission, toObjectIdOrThrow } from "#server/utils/roles";
import { sanitizeMongoInput, validateString } from "#server/utils/validators";
import {
    routinesCollection,
    recomputeRoutineTotals,
    normalizeRoutineExercise,
    type RoutineDoc,
} from "#server/utils/routine-helpers";

// PUT /api/routines/:id — update a routine (admin only).
export default defineEventHandler(async (event) => {
    await requirePermission(event, "treinos.edit");
    const id = toObjectIdOrThrow(getRouterParam(event, "id") || "");
    const body = sanitizeMongoInput(await readBody<Record<string, unknown>>(event));

    const col = await routinesCollection();
    const existing = (await col.findOne({ _id: id })) as RoutineDoc | null;
    if (!existing) throw createError({ statusCode: 404, message: "Rotina não encontrada" });

    const update: Partial<RoutineDoc> = { updatedAt: new Date().toISOString() };
    if (body.name != null) update.name = validateString(body.name, "name", 120).trim();
    if (body.series != null) update.series = String(body.series).slice(0, 20);
    if (body.description != null) update.description = String(body.description).slice(0, 1000);
    if (Array.isArray(body.exercises)) {
        update.exercises = (body.exercises as Array<Record<string, unknown>>).map(
            normalizeRoutineExercise,
        );
    }

    const merged = { ...existing, ...update } as RoutineDoc;
    recomputeRoutineTotals(merged);
    update.estimatedDurationMinutes = merged.estimatedDurationMinutes;
    update.estimatedCaloriesBurned = merged.estimatedCaloriesBurned;

    await col.updateOne({ _id: id }, { $set: update });
    return { success: true };
});
