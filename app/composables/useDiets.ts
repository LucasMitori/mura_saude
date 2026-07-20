import { $fetch } from "ofetch";
import type { Diet } from "#shared/types/diet";
import { useAuthStore } from "~/stores/auth.store";

export function useDiets() {
    const authStore = useAuthStore();

    function headers() {
        return authStore.authHeaders;
    }

    async function listDiets(): Promise<Diet[]> {
        return await $fetch<Diet[]>("/api/diets", { headers: headers() });
    }

    async function createDiet(diet: Partial<Diet>) {
        return await $fetch<{ success: boolean; dietId: string }>("/api/diets", {
            method: "POST",
            body: diet,
            headers: headers(),
        });
    }

    async function updateDiet(id: string, diet: Partial<Diet>) {
        return await $fetch<{ success: boolean }>(`/api/diets/${id}`, {
            method: "PUT",
            body: diet,
            headers: headers(),
        });
    }

    async function deleteDiet(id: string) {
        return await $fetch<{ success: boolean }>(`/api/diets/${id}`, {
            method: "DELETE",
            headers: headers(),
        });
    }

    async function setDietActive(id: string, active: boolean) {
        return await $fetch<{ success: boolean; active: boolean }>(
            `/api/diets/${id}/activate`,
            { method: "POST", body: { active }, headers: headers() },
        );
    }

    return { listDiets, createDiet, updateDiet, deleteDiet, setDietActive };
}
