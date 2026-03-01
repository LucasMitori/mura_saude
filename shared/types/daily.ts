// ===== UNITS =====
export type WeightUnit = "kg" | "lb";
export type PercentageUnit = "%";
export type VolumeUnit = "l" | "ml";
export type EnergyUnit = "kcal";
export type AgeUnit = "years";
export type ISODateString = string;

// ===== MEASUREMENT VALUE =====
export interface MeasurementValue<U extends string> {
    value: number;
    unit: U;
}

// ===== BIOIMPEDANCE (Complete OKOK International Data) =====
export interface BioimpedanceMeasurement {
    // Peso
    weight: MeasurementValue<WeightUnit>;
    // IMC
    bmi: number;
    // Gordura (%)
    bodyFatPercentage: MeasurementValue<PercentageUnit>;
    // Peso da gordura (kg)
    bodyFatMass: MeasurementValue<WeightUnit>;
    // Percentual da massa muscular esquelética (%)
    skeletalMuscleMassPercentage: MeasurementValue<PercentageUnit>;
    // Registro de massa muscular (%)
    muscleMassRecord: MeasurementValue<PercentageUnit>;
    // Peso da massa muscular esquelética (kg)
    skeletalMuscleMass: MeasurementValue<WeightUnit>;
    // Peso da massa muscular (kg)
    muscleMass: MeasurementValue<WeightUnit>;
    // Água (%)
    waterPercentage: MeasurementValue<PercentageUnit>;
    // Peso da água (kg)
    waterMass: MeasurementValue<WeightUnit>;
    // Gordura visceral
    visceralFat: number;
    // Ossos (kg)
    boneMass: MeasurementValue<WeightUnit>;
    // Metabolismo (kcal)
    basalMetabolicRate: MeasurementValue<EnergyUnit>;
    // Proteína (%)
    proteinPercentage: MeasurementValue<PercentageUnit>;
    // Obesidade (%)
    obesityPercentage: MeasurementValue<PercentageUnit>;
    // Idade metabólica
    metabolicAge: MeasurementValue<AgeUnit>;
}

export type MeasurementTime = "morning" | "evening";

export interface BodyMeasurementEntry {
    time: MeasurementTime;
    timestamp: string;
    data: BioimpedanceMeasurement;
}

// ===== MEALS =====
export type MealType =
    | "pre_workout"
    | "breakfast"
    | "morning_snack"
    | "lunch"
    | "afternoon_snack"
    | "pre_workout_meal"
    | "post_workout"
    | "dinner"
    | "supper"
    | "snack";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
    pre_workout: "Pré-Treino",
    breakfast: "Café da Manhã",
    morning_snack: "Lanche da Manhã",
    lunch: "Almoço",
    afternoon_snack: "Lanche da Tarde",
    pre_workout_meal: "Pré-Treino (Refeição)",
    post_workout: "Pós-Treino",
    dinner: "Jantar",
    supper: "Ceia",
    snack: "Lanche",
};

export interface FoodItem {
    name: string;
    weightGrams: number;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    fiber?: number;
}

export interface Meal {
    type: MealType;
    label: string;
    time: string; // HH:mm
    foods: FoodItem[];
    totalCalories: number;
    totalWeight: number;
    notes?: string;
}

// ===== WORKOUT =====
export type ExerciseCategory = "strength" | "cardio" | "flexibility" | "sport";

export type MuscleGroup =
    | "chest"
    | "back"
    | "shoulders"
    | "biceps"
    | "triceps"
    | "forearms"
    | "abs"
    | "quadriceps"
    | "hamstrings"
    | "glutes"
    | "calves"
    | "full_body"
    | "other";

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
    chest: "Peito",
    back: "Costas",
    shoulders: "Ombros",
    biceps: "Bíceps",
    triceps: "Tríceps",
    forearms: "Antebraços",
    abs: "Abdômen",
    quadriceps: "Quadríceps",
    hamstrings: "Posterior",
    glutes: "Glúteos",
    calves: "Panturrilha",
    full_body: "Full Body",
    other: "Outro",
};

export type WorkoutIntensity = "low" | "moderate" | "high" | "very_high";

export interface Exercise {
    name: string;
    category: ExerciseCategory;
    muscleGroup: MuscleGroup;
    durationMinutes: number;
    intensity: WorkoutIntensity;
    estimatedCaloriesBurned: number;
    sets?: number;
    reps?: number;
    weightKg?: number;
    notes?: string;
}

export interface WorkoutSession {
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    totalDurationMinutes: number;
    exercises: Exercise[];
    totalCaloriesBurned: number;
    notes?: string;
}

// ===== WATER =====
export interface DailyWater {
    intake: MeasurementValue<VolumeUnit>;
    goal: MeasurementValue<VolumeUnit>;
}

// ===== DAILY SUMMARY (calculated) =====
export interface DailySummary {
    totalCaloriesConsumed: number;
    totalCaloriesBurned: number;
    netCalories: number;
    caloricGoal: number;
    caloricBalance: number; // negative = deficit, positive = surplus
    isDeficit: boolean;
    deficitPercentage: number;
    weightChange: number | null; // morning vs evening difference
    waterPercentage: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    totalFiber: number;
}

// ===== DAILY RECORD (main document) =====
export interface DailyRecord {
    _id?: string;
    userId: string;
    date: ISODateString;

    // Bioimpedance measurements (morning + optional evening)
    bodyMeasurements: BodyMeasurementEntry[];

    // Water tracking
    water: DailyWater;

    // All meals of the day
    meals: Meal[];

    // Workout session
    workout: WorkoutSession | null;

    // Caloric goal for the day
    caloricGoal: number;

    // Calculated summary
    summary: DailySummary;

    // General notes
    notes: string;

    createdAt: string;
    updatedAt: string;
}
