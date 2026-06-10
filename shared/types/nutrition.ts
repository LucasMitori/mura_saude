// ===== NUTRITION (Open Food Facts) =====
// Normalized shape returned by our /api/nutrition proxy. All macro values are
// expressed per 100 g so the client can scale them by the entered weight.

export interface NutritionPer100g {
    calories: number; // kcal / 100 g
    protein: number; // g / 100 g
    carbs: number; // g / 100 g
    fats: number; // g / 100 g
    fiber: number; // g / 100 g
}

export interface NutritionFood {
    code: string; // barcode / OFF product code
    name: string;
    brand: string;
    imageUrl: string | null;
    servingSizeGrams: number | null; // parsed from serving_size when available
    per100g: NutritionPer100g;
}

export interface NutritionSearchResult {
    query: string;
    count: number;
    foods: NutritionFood[];
    page: number;
    hasMore: boolean;
    // True when Open Food Facts failed and we degraded to empty instead of erroring.
    degraded?: boolean;
}
