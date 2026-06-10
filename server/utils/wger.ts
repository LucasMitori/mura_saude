import type { ExerciseSuggestion } from "../../shared/types/workout-routine";

// wger.de — free, open-source, key-less workout database. Proxied server-side
// (Nitro global $fetch, no npm dependency) just like Open Food Facts.
const WGER_BASE = "https://wger.de/api/v2";
const USER_AGENT = "MuraSaude/1.0 (health tracker)";

interface WgerSuggestion {
    value?: string;
    data?: {
        id?: number;
        base_id?: number;
        name?: string;
        category?: string;
        image?: string | null;
        image_thumbnail?: string | null;
        muscles?: string;
    };
}

async function wgerFetch<T>(url: string, query: Record<string, unknown>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            return await $fetch<T>(url, {
                query,
                headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
                timeout: 9000,
                retry: 0,
            });
        } catch (e) {
            lastErr = e;
            if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
        }
    }
    throw lastErr;
}

export async function wgerSearch(term: string): Promise<ExerciseSuggestion[]> {
    // `language` must be 2-letter short_names (NOT "english"); wger filters
    // translations by short_name and an invalid value matches nothing. Search
    // English + Portuguese + Spanish so both PT terms ("supino") and English
    // names resolve.
    const res = await wgerFetch<{ suggestions?: WgerSuggestion[] }>(
        `${WGER_BASE}/exercise/search/`,
        { term, language: "en,pt,es", format: "json" },
    );
    const out: ExerciseSuggestion[] = [];
    const seen = new Set<string>();
    for (const s of res?.suggestions || []) {
        const name = (s.value || s.data?.name || "").trim();
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const img = s.data?.image || s.data?.image_thumbnail || null;
        out.push({
            id: s.data?.base_id ?? s.data?.id ?? name,
            name,
            category: s.data?.category || "",
            muscles: s.data?.muscles || "",
            imageUrl: img ? (img.startsWith("http") ? img : `https://wger.de${img}`) : null,
        });
    }
    return out;
}
