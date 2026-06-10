import { requirePermission, getDataOwnerId } from "#server/utils/roles";
import { sanitizeMongoInput, validateString } from "#server/utils/validators";
import {
    routinesCollection,
    ensureRoutineIndexes,
    recomputeRoutineTotals,
    normalizeRoutineExercise,
    type RoutineDoc,
} from "#server/utils/routine-helpers";

interface CreateRoutineBody {
    name: string;
    series?: string;
    description?: string;
    exercises?: Array<Record<string, unknown>>;
}

// POST /api/routines — create a workout routine (admin only).
export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "treinos.create");
    const userId = await getDataOwnerId(ctx);
    await ensureRoutineIndexes();

    const body = sanitizeMongoInput(await readBody<CreateRoutineBody>(event));
    const name = validateString(body.name, "name", 120).trim();
    if (!name) throw createError({ statusCode: 400, message: "Nome da rotina é obrigatório" });

    const now = new Date().toISOString();
    const doc: RoutineDoc = {
        userId,
        name,
        series: typeof body.series === "string" ? body.series.slice(0, 20) : "",
        description: typeof body.description === "string" ? body.description.slice(0, 1000) : "",
        exercises: Array.isArray(body.exercises) ? body.exercises.map(normalizeRoutineExercise) : [],
        estimatedDurationMinutes: 0,
        estimatedCaloriesBurned: 0,
        archived: false,
        createdAt: now,
        updatedAt: now,
    };
    recomputeRoutineTotals(doc);

    const col = await routinesCollection();
    const res = await col.insertOne(doc as unknown as Record<string, unknown>);
    return { success: true, _id: res.insertedId.toString() };
});
