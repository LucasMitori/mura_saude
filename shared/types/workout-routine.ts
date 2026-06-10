import type { Exercise } from "./daily";

// A reusable workout routine (e.g. "Treino A – Peito e Tríceps") created by a
// trainer/admin. Independent of any single day; can be applied to a day's log.
export interface WorkoutRoutine {
    _id?: string;
    userId: string;
    name: string;
    series?: string; // "A", "B", "C"...
    description?: string;
    exercises: Exercise[];
    estimatedDurationMinutes: number;
    estimatedCaloriesBurned: number;
    archived?: boolean;
    createdAt: string;
    updatedAt: string;
}

// Normalized exercise suggestion returned by our wger proxy.
export interface ExerciseSuggestion {
    id: number | string;
    name: string;
    category: string; // wger category, e.g. "Chest"
    muscles: string; // primary muscles (comma-joined), when available
    imageUrl: string | null;
}

export interface ExerciseSearchResult {
    query: string;
    exercises: ExerciseSuggestion[];
    degraded?: boolean;
}
