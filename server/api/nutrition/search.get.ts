import { getAuthUser } from "#server/utils/auth";
import { offSearch } from "#server/utils/nutrition";
import { searchBrFoods } from "#server/utils/foods-br";
import type { NutritionSearchResult } from "../../../shared/types/nutrition";

// GET /api/nutrition/search?q=arroz — local Brazilian TACO staples first
// (instant, offline, accent-insensitive), then proxied Open Food Facts.
// Auth-required so this never becomes an open relay.
export default defineEventHandler(async (event): Promise<NutritionSearchResult> => {
    getAuthUser(event);

    const query = getQuery(event);
    const term = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
    const page = Math.min(Math.max(1, Number(query.page) || 1), 20);

    if (term.length < 2) {
        return { query: term, count: 0, foods: [], page, hasMore: false };
    }

    // Brazilian staples lead page 1 only — later pages are pure OFF.
    const local = page === 1 ? searchBrFoods(term) : [];

    try {
        const { foods, rawCount } = await offSearch(term, page, 20);
        const merged = [...local, ...foods];
        return { query: term, count: merged.length, foods: merged, page, hasMore: rawCount >= 20 };
    } catch (err) {
        // Open Food Facts is occasionally flaky/rate-limited. Degrade gracefully
        // to the local catalog (or empty) instead of a 502 so the UI just shows
        // what it has and the console stays clean.
        console.warn("[nutrition] OFF search failed:", (err as Error)?.message);
        return {
            query: term,
            count: local.length,
            foods: local,
            page,
            hasMore: false,
            degraded: true,
        };
    }
});
