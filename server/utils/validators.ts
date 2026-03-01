import type {
    VolumeUnit,
    MealType,
    WorkoutType,
    WorkoutIntensity,
} from "../../shared/types/daily";

export function validateRequired(value: unknown, fieldName: string): void {
    if (value === undefined || value === null || value === "") {
        throw createError({
            statusCode: 400,
            message: `${fieldName} is required`,
        });
    }
}

export function validateDate(date: string): void {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) {
        throw createError({
            statusCode: 400,
            message: "Date must be in YYYY-MM-DD format",
        });
    }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
    if (typeof value !== "number" || value < 0) {
        throw createError({
            statusCode: 400,
            message: `${fieldName} must be a positive number`,
        });
    }
}

export function validateVolumeUnit(unit: string): unit is VolumeUnit {
    return unit === "l" || unit === "ml";
}

export function validateMealType(type: string): type is MealType {
    return ["breakfast", "lunch", "dinner", "snack"].includes(type);
}

export function validateWorkoutType(type: string): type is WorkoutType {
    return ["cardio", "strength", "mixed", "mobility"].includes(type);
}

export function validateWorkoutIntensity(
    intensity: string,
): intensity is WorkoutIntensity {
    return ["low", "moderate", "high"].includes(intensity);
}
function createError(arg0: { statusCode: number; message: string }) {
    throw new Error("Function not implemented.");
}
