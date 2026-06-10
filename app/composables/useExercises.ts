import { $fetch } from "ofetch";
import type {
    ExerciseSearchResult,
    ExerciseSuggestion,
} from "#shared/types/workout-routine";
import { useAuthStore } from "~/stores/auth.store";

export function useExercises() {
    const authStore = useAuthStore();

    async function searchExercises(term: string): Promise<ExerciseSuggestion[]> {
        const q = (term || "").trim();
        if (q.length < 2) return [];
        const res = await $fetch<ExerciseSearchResult>("/api/exercises/search", {
            params: { q },
            headers: authStore.authHeaders,
        });
        return res.exercises;
    }

    return { searchExercises };
}
