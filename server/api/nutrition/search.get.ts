import { getAuthUser } from "#server/utils/auth";
import { offSearch } from "#server/utils/nutrition";
import type { NutritionSearchResult } from "../../../shared/types/nutrition";

// GET /api/nutrition/search?q=arroz — proxied Open Food Facts text search.
// Auth-required so this never becomes an open relay.
export default defineEventHandler(async (event): Promise<NutritionSearchResult> => {
    getAuthUser(event);

    const query = getQuery(event);
    const term = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
    const page = Math.min(Math.max(1, Number(query.page) || 1), 20);

    if (term.length < 2) {
        return { query: term, count: 0, foods: [], page, hasMore: false };
    }

    try {
        const { foods, rawCount } = await offSearch(term, page, 20);
        return { query: term, count: foods.length, foods, page, hasMore: rawCount >= 20 };
    } catch (err) {
        // Open Food Facts is occasionally flaky/rate-limited. Degrade gracefully
        // to an empty result (200) instead of a 502 so the UI just shows
        // "no results" and the console stays clean.
        console.warn("[nutrition] OFF search failed:", (err as Error)?.message);
        return { query: term, count: 0, foods: [], page, hasMore: false, degraded: true };
    }
});
