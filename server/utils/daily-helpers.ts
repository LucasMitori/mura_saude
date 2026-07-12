import { randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import { getDatabase } from "#server/utils/mongodb";

export function generateSubId(): string {
    return randomBytes(8).toString("hex");
}

export interface MealLite {
    id: string;
    type: string;
    label: string;
    time: string;
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
    notes?: string;
    // Kept after the binary's 30-day TTL deletion so the UI can explain why
    // the photo is gone (see shared/meal-images.ts).
    image?: { id: string; uploadedAt: string } | null;
}

export interface BodyMeasurementEntryLite {
    id: string;
    time: "morning" | "evening";
    timestamp: string;
    data: Record<string, unknown>;
}

export interface WorkoutLite {
    id?: string;
    startTime: string;
    endTime: string;
    totalDurationMinutes: number;
    exercises: Array<Record<string, unknown>>;
    totalCaloriesBurned: number;
    notes?: string;
}

export interface DailyRecordDoc {
    _id?: unknown;
    userId: string;
    date: string;
    bodyMeasurements: BodyMeasurementEntryLite[];
    meals: MealLite[];
    workout: WorkoutLite | null;
    water: { intake: { value: number; unit: string }; goal: { value: number; unit: string } };
    caloricGoal: number;
    summary: Record<string, unknown>;
    notes: string;
    createdAt?: string;
    updatedAt?: string;
}

export function recomputeMealTotals(meal: MealLite): void {
    const foods = meal.foods || [];
    meal.totalCalories = Math.round(foods.reduce((s, f) => s + (Number(f.calories) || 0), 0));
    meal.totalWeight = Math.round(foods.reduce((s, f) => s + (Number(f.weightGrams) || 0), 0));
}

export function recomputeWorkoutTotals(w: WorkoutLite): void {
    w.totalCaloriesBurned = Math.round(
        (w.exercises || []).reduce(
            (s, e) => s + (Number((e as Record<string, unknown>).estimatedCaloriesBurned) || 0),
            0,
        ),
    );
}

export function recomputeDailySummary(rec: DailyRecordDoc): void {
    const totalCaloriesConsumed = rec.meals.reduce((s, m) => s + (m.totalCalories || 0), 0);
    const totalCaloriesBurned = rec.workout?.totalCaloriesBurned || 0;
    const netCalories = totalCaloriesConsumed - totalCaloriesBurned;
    const caloricGoal = rec.caloricGoal || 2000;
    const caloricBalance = netCalories - caloricGoal;
    const isDeficit = caloricBalance < 0;
    const deficitPercentage =
        caloricGoal > 0 ? Math.round((caloricBalance / caloricGoal) * 100) : 0;

    const totalProtein = rec.meals.reduce(
        (s, m) => s + (m.foods || []).reduce((a, f) => a + (Number(f.protein) || 0), 0),
        0,
    );
    const totalCarbs = rec.meals.reduce(
        (s, m) => s + (m.foods || []).reduce((a, f) => a + (Number(f.carbs) || 0), 0),
        0,
    );
    const totalFats = rec.meals.reduce(
        (s, m) => s + (m.foods || []).reduce((a, f) => a + (Number(f.fats) || 0), 0),
        0,
    );
    const totalFiber = rec.meals.reduce(
        (s, m) => s + (m.foods || []).reduce((a, f) => a + (Number(f.fiber) || 0), 0),
        0,
    );

    const morning = rec.bodyMeasurements.find((m) => m.time === "morning");
    const evening = rec.bodyMeasurements.find((m) => m.time === "evening");
    const morningWeight =
        ((morning?.data?.weight as { value?: number } | undefined)?.value) ?? null;
    const eveningWeight =
        ((evening?.data?.weight as { value?: number } | undefined)?.value) ?? null;
    const weightChange =
        morningWeight !== null && eveningWeight !== null
            ? Math.round((eveningWeight - morningWeight) * 100) / 100
            : null;

    const waterIntake = rec.water?.intake?.value ?? 0;
    const waterGoal = rec.water?.goal?.value ?? 0;
    const waterPercentage = waterGoal > 0 ? Math.round((waterIntake / waterGoal) * 100) : 0;

    rec.summary = {
        totalCaloriesConsumed: Math.round(totalCaloriesConsumed),
        totalCaloriesBurned: Math.round(totalCaloriesBurned),
        netCalories: Math.round(netCalories),
        caloricGoal,
        caloricBalance: Math.round(caloricBalance),
        isDeficit,
        deficitPercentage,
        weightChange,
        waterPercentage,
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalFats: Math.round(totalFats * 10) / 10,
        totalFiber: Math.round(totalFiber * 10) / 10,
    };
}

export function emptyDailyRecord(
    userId: string,
    date: string,
    waterGoal?: { value: number; unit: "l" | "ml" },
    caloricGoal?: number,
): DailyRecordDoc {
    const now = new Date().toISOString();
    const goal = waterGoal || { value: 3, unit: "l" };
    const rec: DailyRecordDoc = {
        userId,
        date,
        bodyMeasurements: [],
        meals: [],
        workout: null,
        water: {
            intake: { value: 0, unit: goal.unit },
            goal,
        },
        caloricGoal: caloricGoal || 2000,
        summary: {},
        notes: "",
        createdAt: now,
        updatedAt: now,
    };
    recomputeDailySummary(rec);
    return rec;
}

export async function getOrCreateDailyRecord(
    userId: string,
    date: string,
): Promise<DailyRecordDoc> {
    const db: Db = await getDatabase();
    const col = db.collection("dailyRecords");
    const existing = await col.findOne({ userId, date });
    if (existing) {
        return existing as unknown as DailyRecordDoc;
    }
    const fresh = emptyDailyRecord(userId, date);
    try {
        await col.insertOne(fresh as unknown as Record<string, unknown>);
    } catch (err: unknown) {
        // Duplicate key: a concurrent request created the day between our
        // findOne and insertOne. The unique (userId,date) index makes this
        // safe — just use the winner's document.
        if ((err as { code?: number })?.code === 11000) {
            const winner = await col.findOne({ userId, date });
            if (winner) return winner as unknown as DailyRecordDoc;
        }
        throw err;
    }
    return fresh;
}

/**
 * Append one meal atomically via $push — unlike persistDailyRecord (which
 * replaces the whole meals array), concurrent adds can never overwrite each
 * other. The summary is recomputed from a fresh read afterwards.
 */
export async function appendMealAndRecompute(
    userId: string,
    date: string,
    meal: MealLite,
): Promise<void> {
    const db = await getDatabase();
    const col = db.collection("dailyRecords");
    await col.updateOne(
        { userId, date },
        {
            $push: { meals: meal as unknown as never },
            $set: { updatedAt: new Date().toISOString() },
        },
    );
    const fresh = (await col.findOne({ userId, date })) as unknown as DailyRecordDoc | null;
    if (!fresh) return;
    recomputeDailySummary(fresh);
    await col.updateOne({ userId, date }, { $set: { summary: fresh.summary } });
}

export async function persistDailyRecord(rec: DailyRecordDoc): Promise<void> {
    const db = await getDatabase();
    const col = db.collection("dailyRecords");
    rec.updatedAt = new Date().toISOString();
    await col.updateOne(
        { userId: rec.userId, date: rec.date },
        {
            $set: {
                bodyMeasurements: rec.bodyMeasurements,
                meals: rec.meals,
                workout: rec.workout,
                water: rec.water,
                caloricGoal: rec.caloricGoal,
                summary: rec.summary,
                notes: rec.notes,
                updatedAt: rec.updatedAt,
            },
            $setOnInsert: { createdAt: rec.createdAt || new Date().toISOString() },
        },
        { upsert: true },
    );
}

export async function ensureDailyRecordsIndexes(): Promise<void> {
    const db = await getDatabase();
    const col = db.collection("dailyRecords");
    await col
        .createIndex({ userId: 1, date: 1 }, { unique: true })
        .catch(() => {});
    await col.createIndex({ date: -1 }).catch(() => {});
}
