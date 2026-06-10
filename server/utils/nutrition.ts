import type { NutritionFood } from "../../shared/types/nutrition";

// Open Food Facts is a free, key-less, crowd-sourced food database with broad
// Brazilian coverage. We proxy it server-side so the browser never talks to a
// third party directly and so we can normalize the (very messy) nutriment shape
// into clean per-100g numbers. No npm dependency is added — we use Nitro's
// global $fetch. See memory: vuetify-css-workaround (npm registry is blocked).

const OFF_BASE = "https://world.openfoodfacts.org";
// OFF asks every client to identify itself with a descriptive User-Agent.
const USER_AGENT = "MuraSaude/1.0 (health tracker)";
const OFF_FIELDS =
    "code,product_name,product_name_pt,brands,serving_size,image_small_url,image_front_small_url,nutriments";

function num(v: unknown): number {
    const n = typeof v === "string" ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? n : 0;
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

// "30 g", "1 portion (30 g)", "200ml" -> grams when expressible, else null.
function parseServingGrams(serving: unknown): number | null {
    if (typeof serving !== "string") return null;
    const m = serving.match(/(\d+(?:[.,]\d+)?)\s*g/i);
    if (!m) return null;
    const g = parseFloat(m[1]!.replace(",", "."));
    return Number.isFinite(g) && g > 0 ? g : null;
}

interface OffProduct {
    code?: string;
    product_name?: string;
    product_name_pt?: string;
    brands?: string;
    serving_size?: string;
    image_small_url?: string;
    image_front_small_url?: string;
    nutriments?: Record<string, unknown>;
}

export function normalizeOffProduct(p: OffProduct): NutritionFood | null {
    const name = (p.product_name_pt || p.product_name || "").trim();
    if (!name) return null;

    const n = p.nutriments || {};
    let kcal = num(n["energy-kcal_100g"]);
    if (!kcal) {
        // Some products only carry energy in kJ.
        const kj = num(n["energy-kj_100g"]) || num(n["energy_100g"]);
        if (kj) kcal = kj / 4.184;
    }

    return {
        code: String(p.code || ""),
        name,
        brand: (p.brands || "").split(",")[0]?.trim() || "",
        imageUrl: p.image_small_url || p.image_front_small_url || null,
        servingSizeGrams: parseServingGrams(p.serving_size),
        per100g: {
            calories: Math.round(kcal),
            protein: round1(num(n["proteins_100g"])),
            carbs: round1(num(n["carbohydrates_100g"])),
            fats: round1(num(n["fat_100g"])),
            fiber: round1(num(n["fiber_100g"])),
        },
    };
}

// Open Food Facts' cgi/search.pl is occasionally slow or rate-limits bursts,
// which surfaced as 502s in the client. Retry once before giving up.
async function offFetch<T>(url: string, query: Record<string, unknown>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            return await $fetch<T>(url, {
                query,
                headers: { "User-Agent": USER_AGENT },
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

export interface OffSearchPage {
    foods: NutritionFood[];
    // Raw product count from OFF (before filtering) — used to decide hasMore.
    rawCount: number;
}

export async function offSearch(term: string, page = 1, pageSize = 20): Promise<OffSearchPage> {
    const res = await offFetch<{ products?: OffProduct[] }>(`${OFF_BASE}/cgi/search.pl`, {
        search_terms: term,
        search_simple: 1,
        action: "process",
        json: 1,
        page,
        page_size: pageSize,
        fields: OFF_FIELDS,
        lc: "pt",
    });
    const products = res?.products || [];
    const foods: NutritionFood[] = [];
    for (const p of products) {
        const food = normalizeOffProduct(p);
        // Skip entries with no usable calorie data — they're useless for tracking.
        if (food && food.per100g.calories > 0) foods.push(food);
    }
    return { foods, rawCount: products.length };
}

export async function offBarcode(code: string): Promise<NutritionFood | null> {
    const res = await offFetch<{ status?: number; product?: OffProduct }>(
        `${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json`,
        { fields: OFF_FIELDS },
    );
    if (!res || res.status !== 1 || !res.product) return null;
    return normalizeOffProduct(res.product);
}
