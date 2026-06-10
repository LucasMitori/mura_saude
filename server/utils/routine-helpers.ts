import type { Collection } from "mongodb";
import { getDatabase } from "#server/utils/mongodb";

export interface RoutineExerciseLite {
    name: string;
    category: string;
    muscleGroup: string;
    durationMinutes: number;
    intensity: string;
    estimatedCaloriesBurned: number;
    sets?: number;
    reps?: number;
    weightKg?: number;
    notes?: string;
}

export interface RoutineDoc {
    _id?: unknown;
    userId: string;
    name: string;
    series?: string;
    description?: string;
    exercises: RoutineExerciseLite[];
    estimatedDurationMinutes: number;
    estimatedCaloriesBurned: number;
    archived?: boolean;
    createdAt: string;
    updatedAt: string;
}

export function normalizeRoutineExercise(e: Record<string, unknown>): RoutineExerciseLite {
    const n = (v: unknown) => Math.max(0, Number(v) || 0);
    const opt = (v: unknown) => (v == null || v === "" ? undefined : n(v));
    return {
        name: String(e?.name || "").slice(0, 120),
        category: String(e?.category || "strength").slice(0, 40),
        muscleGroup: String(e?.muscleGroup || "other").slice(0, 40),
        durationMinutes: n(e?.durationMinutes),
        intensity: String(e?.intensity || "moderate").slice(0, 20),
        estimatedCaloriesBurned: n(e?.estimatedCaloriesBurned),
        sets: opt(e?.sets),
        reps: opt(e?.reps),
        weightKg: opt(e?.weightKg),
        notes: e?.notes ? String(e.notes).slice(0, 500) : undefined,
    };
}

export function recomputeRoutineTotals(r: RoutineDoc): void {
    const ex = r.exercises || [];
    r.estimatedCaloriesBurned = Math.round(
        ex.reduce((s, e) => s + (Number(e.estimatedCaloriesBurned) || 0), 0),
    );
    r.estimatedDurationMinutes = Math.round(
        ex.reduce((s, e) => s + (Number(e.durationMinutes) || 0), 0),
    );
}

export async function routinesCollection(): Promise<Collection> {
    const db = await getDatabase();
    return db.collection("workoutRoutines");
}

export async function ensureRoutineIndexes(): Promise<void> {
    const col = await routinesCollection();
    await col.createIndex({ userId: 1, updatedAt: -1 }).catch(() => {});
}
