import type { MealType, FoodItem } from "./daily";

// ===== DIET PLANS =====
// Built by the nutritionist (diet.edit) on the /diet page; visible to every
// logged-in user (diet.view). One plan can be marked active — the dashboard
// shows it as the patient's current diet.

export interface DietMeal {
    id: string;
    type: MealType;
    time: string; // suggested HH:mm
    label: string;
    foods: FoodItem[];
    totalCalories: number;
    totalWeight: number;
    notes?: string;
}

export interface Diet {
    _id?: string;
    name: string;
    description: string;
    targetCalories: number; // daily kcal target of the plan (0 = not set)
    meals: DietMeal[];
    active: boolean;
    totalCalories: number; // sum of all meals (computed server-side)
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    totalFiber: number;
    createdBy: string; // userId of the author (nutritionist/admin)
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}
