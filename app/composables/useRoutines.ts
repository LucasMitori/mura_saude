import { $fetch } from "ofetch";
import type { WorkoutRoutine } from "#shared/types/workout-routine";
import { useAuthStore } from "~/stores/auth.store";

export function useRoutines() {
    const authStore = useAuthStore();
    const headers = () => authStore.authHeaders;

    async function listRoutines(): Promise<WorkoutRoutine[]> {
        const res = await $fetch<WorkoutRoutine[]>("/api/routines", { headers: headers() });
        return Array.isArray(res) ? res : [];
    }

    async function createRoutine(payload: Partial<WorkoutRoutine>) {
        return await $fetch<{ success: boolean; _id: string }>("/api/routines", {
            method: "POST",
            body: payload,
            headers: headers(),
        });
    }

    async function updateRoutine(id: string, payload: Partial<WorkoutRoutine>) {
        return await $fetch(`/api/routines/${id}`, {
            method: "PUT",
            body: payload,
            headers: headers(),
        });
    }

    async function deleteRoutine(id: string) {
        return await $fetch(`/api/routines/${id}`, {
            method: "DELETE",
            headers: headers(),
        });
    }

    async function archiveRoutine(id: string, archived: boolean) {
        return await $fetch(`/api/routines/${id}/archive`, {
            method: "POST",
            body: { archived },
            headers: headers(),
        });
    }

    return { listRoutines, createRoutine, updateRoutine, deleteRoutine, archiveRoutine };
}
