import { randomBytes } from "node:crypto";
import { validateMealType } from "#server/utils/validators";

export const DIETS_COLLECTION = "diets";

// Hard caps keep a hostile/buggy client from bloating documents.
const MAX_MEALS = 20;
const MAX_FOODS_PER_MEAL = 40;
const MAX_NAME = 120;
const MAX_DESCRIPTION = 2000;
const MAX_TARGET_KCAL = 20000;

export interface DietMealDoc {
    id: string;
    type: string;
    time: string;
    label: string;
    notes: string;
    foods: Array<{
        name: string;
        weightGrams: number;
        calories: number;
        protein?: number;
        carbs?: number;
        fats?: number;
        fiber?: number;
    }>;
    totalCalories: number;
    totalWeight: number;
}

export interface DietDoc {
    name: string;
    description: string;
    targetCalories: number;
    meals: DietMealDoc[];
    active: boolean;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    totalFiber: number;
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function clampNumber(v: unknown, min: number, max: number): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
}

/**
 * Validate and EXPLICITLY map a client diet payload into a clean document —
 * client input is never spread into the DB (same policy as bulk day-save).
 * Totals/macros are always recomputed server-side.
 */
export function buildDietDoc(
    body: Record<string, unknown>,
    author: { userId: string; name: string },
    existing?: Pick<DietDoc, "active" | "createdBy" | "createdByName" | "createdAt">,
): DietDoc {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
    if (!name) {
        throw createError({ statusCode: 400, message: "Nome da dieta é obrigatório" });
    }

    const rawMeals = Array.isArray(body.meals) ? body.meals : [];
    if (rawMeals.length > MAX_MEALS) {
        throw createError({ statusCode: 400, message: `Máximo de ${MAX_MEALS} refeições por dieta` });
    }

    const meals: DietMealDoc[] = rawMeals.map((raw) => {
        const m = (raw ?? {}) as Record<string, unknown>;
        if (!validateMealType(m.type)) {
            throw createError({ statusCode: 400, message: "Tipo de refeição inválido" });
        }
        const rawFoods = Array.isArray(m.foods) ? m.foods : [];
        if (rawFoods.length > MAX_FOODS_PER_MEAL) {
            throw createError({
                statusCode: 400,
                message: `Máximo de ${MAX_FOODS_PER_MEAL} alimentos por refeição`,
            });
        }
        const foods = rawFoods.map((rf) => {
            const f = (rf ?? {}) as Record<string, unknown>;
            return {
                name: String(f.name || "").slice(0, 300),
                weightGrams: clampNumber(f.weightGrams, 0, 100000),
                calories: clampNumber(f.calories, 0, 100000),
                protein: f.protein != null ? clampNumber(f.protein, 0, 10000) : undefined,
                carbs: f.carbs != null ? clampNumber(f.carbs, 0, 10000) : undefined,
                fats: f.fats != null ? clampNumber(f.fats, 0, 10000) : undefined,
                fiber: f.fiber != null ? clampNumber(f.fiber, 0, 10000) : undefined,
            };
        });
        const meal: DietMealDoc = {
            id:
                typeof m.id === "string" && /^[a-f0-9]{16}$/.test(m.id)
                    ? m.id
                    : randomBytes(8).toString("hex"),
            type: m.type,
            time: typeof m.time === "string" ? m.time.slice(0, 5) : "",
            label: typeof m.label === "string" ? m.label.slice(0, 300) : "",
            notes: typeof m.notes === "string" ? m.notes.slice(0, 2000) : "",
            foods,
            totalCalories: Math.round(foods.reduce((s, f) => s + f.calories, 0)),
            totalWeight: Math.round(foods.reduce((s, f) => s + f.weightGrams, 0)),
        };
        return meal;
    });

    const sumMacro = (key: "protein" | "carbs" | "fats" | "fiber") =>
        round1(
            meals.reduce(
                (s, m) => s + m.foods.reduce((a, f) => a + (f[key] ?? 0), 0),
                0,
            ),
        );

    const now = new Date().toISOString();
    return {
        name,
        description:
            typeof body.description === "string"
                ? body.description.slice(0, MAX_DESCRIPTION)
                : "",
        targetCalories: Math.round(clampNumber(body.targetCalories, 0, MAX_TARGET_KCAL)),
        meals,
        // `active` is NEVER taken from the body — only the dedicated activate
        // endpoint flips it (and deactivates the others).
        active: existing?.active ?? false,
        totalCalories: Math.round(meals.reduce((s, m) => s + m.totalCalories, 0)),
        totalProtein: sumMacro("protein"),
        totalCarbs: sumMacro("carbs"),
        totalFats: sumMacro("fats"),
        totalFiber: sumMacro("fiber"),
        createdBy: existing?.createdBy ?? author.userId,
        createdByName: existing?.createdByName ?? author.name,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
    };
}
