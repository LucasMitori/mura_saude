import { $fetch } from "ofetch";
import type { NutritionFood, NutritionSearchResult } from "#shared/types/nutrition";
import { useAuthStore } from "~/stores/auth.store";

export function useNutrition() {
    const authStore = useAuthStore();

    async function searchFoods(term: string, page = 1): Promise<NutritionSearchResult> {
        const q = (term || "").trim();
        if (q.length < 2) {
            return { query: q, count: 0, foods: [], page, hasMore: false };
        }
        return await $fetch<NutritionSearchResult>("/api/nutrition/search", {
            params: { q, page },
            headers: authStore.authHeaders,
        });
    }

    async function getByBarcode(code: string): Promise<NutritionFood> {
        return await $fetch<NutritionFood>(
            `/api/nutrition/barcode/${encodeURIComponent(code)}`,
            { headers: authStore.authHeaders },
        );
    }

    return { searchFoods, getByBarcode };
}
