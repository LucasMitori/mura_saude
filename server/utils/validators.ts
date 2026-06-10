import type { VolumeUnit, MealType, WorkoutIntensity } from "../../shared/types/daily";

const MEAL_TYPES: MealType[] = [
    "pre_workout",
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "pre_workout_meal",
    "post_workout",
    "dinner",
    "supper",
    "snack",
];

export function validateRequired(value: unknown, fieldName: string): void {
    if (value === undefined || value === null || value === "") {
        throw createError({
            statusCode: 400,
            message: `${fieldName} is required`,
        });
    }
}

export function validateDate(date: string): void {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw createError({
            statusCode: 400,
            message: "Date must be in YYYY-MM-DD format",
        });
    }
    const d = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) {
        throw createError({
            statusCode: 400,
            message: "Invalid calendar date",
        });
    }
}

export function validatePositiveNumber(value: unknown, fieldName: string): asserts value is number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw createError({
            statusCode: 400,
            message: `${fieldName} must be a non-negative finite number`,
        });
    }
}

export function validateVolumeUnit(unit: unknown): unit is VolumeUnit {
    return unit === "l" || unit === "ml";
}

export function validateMealType(type: unknown): type is MealType {
    return typeof type === "string" && MEAL_TYPES.includes(type as MealType);
}

export function validateWorkoutIntensity(intensity: unknown): intensity is WorkoutIntensity {
    return (
        typeof intensity === "string" &&
        ["low", "moderate", "high", "very_high"].includes(intensity)
    );
}

export function validateString(value: unknown, fieldName: string, max = 1000): string {
    if (typeof value !== "string") {
        throw createError({ statusCode: 400, message: `${fieldName} must be a string` });
    }
    if (value.length > max) {
        throw createError({
            statusCode: 400,
            message: `${fieldName} must be at most ${max} characters`,
        });
    }
    return value;
}

const FORBIDDEN_KEY_PATTERN = /^\$|\./;

export function sanitizeMongoInput<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((v) => sanitizeMongoInput(v)) as unknown as T;
    }
    if (value && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (FORBIDDEN_KEY_PATTERN.test(k)) continue;
            out[k] = sanitizeMongoInput(v);
        }
        return out as unknown as T;
    }
    return value;
}

export function safeDateQueryParam(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    return value;
}
