import { getAuthUser } from "#server/utils/auth";
import { wgerSearch } from "#server/utils/wger";
import { searchLocalExercises } from "#server/utils/exercises-local";
import type {
    ExerciseSearchResult,
    ExerciseSuggestion,
} from "../../../shared/types/workout-routine";

// GET /api/exercises/search?q=supino
// Combines a curated local PT list (always reliable) with wger results, so the
// search returns useful matches even when wger is slow, down, or has no PT data.
export default defineEventHandler(async (event): Promise<ExerciseSearchResult> => {
    getAuthUser(event);

    const query = getQuery(event);
    const q = typeof query.q === "string" ? query.q.trim().slice(0, 60) : "";
    if (q.length < 2) return { query: q, exercises: [] };

    const local = searchLocalExercises(q);

    let wger: ExerciseSuggestion[] = [];
    let wgerFailed = false;
    try {
        wger = await wgerSearch(q);
    } catch (err) {
        console.warn("[exercises] wger search failed:", (err as Error)?.message);
        wgerFailed = true;
    }

    // Local Portuguese matches first; append wger results not already covered.
    const seen = new Set(local.map((e) => e.name.toLowerCase()));
    const exercises: ExerciseSuggestion[] = [...local];
    for (const e of wger) {
        const key = e.name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            exercises.push(e);
        }
    }

    // Only flag degraded if BOTH sources came up empty.
    return { query: q, exercises, degraded: wgerFailed && exercises.length === 0 };
});
