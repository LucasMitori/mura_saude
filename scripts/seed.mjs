#!/usr/bin/env node
/**
 * Standalone seed/mock script — runs against the MongoDB connection in .env.
 *
 * Usage:
 *   node scripts/seed.mjs           # seed admin only
 *   node scripts/seed.mjs --mock    # seed admin + 1 mock day
 *   node scripts/seed.mjs --mock --days=3   # seed admin + N mock days
 */
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function subId() {
    return randomBytes(8).toString("hex");
}

function parseEnv(filePath) {
    const txt = readFileSync(filePath, "utf8");
    const out = {};
    for (const raw of txt.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq < 0) continue;
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        out[k] = v;
    }
    return out;
}

const envPath = resolve(process.cwd(), ".env");
const env = parseEnv(envPath);

const MONGODB_URI = env.MONGODB_URI;
const ADMIN_USERNAME = env.ADMIN_USERNAME || "admin";
const ADMIN_EMAIL = (env.ADMIN_EMAIL || "").toLowerCase().trim();
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI in .env");
    process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Missing ADMIN_EMAIL / ADMIN_PASSWORD in .env");
    process.exit(1);
}

const args = process.argv.slice(2);
const withMock = args.includes("--mock");
const daysArg = args.find((a) => a.startsWith("--days="));
const NUM_DAYS = daysArg ? Math.max(1, parseInt(daysArg.split("=")[1] || "1", 10)) : 1;

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("mura_saude");

    // === Seed admin ===
    await db.collection("users").createIndex({ email: 1 }, { unique: true }).catch(() => {});
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const now = new Date();

    // Remove any other admin user (we want exactly one admin)
    const staleResult = await db.collection("users").deleteMany({
        role: "admin",
        email: { $ne: ADMIN_EMAIL },
    });
    if (staleResult.deletedCount > 0) {
        console.log(`[seed] removed ${staleResult.deletedCount} stale admin user(s)`);
    }

    const result = await db.collection("users").updateOne(
        { email: ADMIN_EMAIL },
        {
            $set: {
                name: ADMIN_USERNAME,
                email: ADMIN_EMAIL,
                password: hashed,
                role: "admin",
                updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
        },
        { upsert: true },
    );
    console.log(
        `[seed] admin ${result.upsertedCount > 0 ? "created" : "updated"}: ${ADMIN_USERNAME} (${ADMIN_EMAIL})`,
    );

    const admin = await db
        .collection("users")
        .findOne({ email: ADMIN_EMAIL }, { projection: { _id: 1 } });
    const adminId = admin._id.toString();

    if (withMock) {
        await db.collection("dailyRecords").createIndex({ userId: 1, date: 1 }, { unique: true }).catch(() => {});

        const todayUTC = new Date();
        for (let i = 0; i < NUM_DAYS; i++) {
            const day = new Date(todayUTC);
            day.setUTCDate(day.getUTCDate() - i);
            const dateStr = day.toISOString().slice(0, 10);
            const rec = buildMockDay(adminId, dateStr, i);
            await db
                .collection("dailyRecords")
                .updateOne(
                    { userId: adminId, date: dateStr },
                    {
                        $set: { ...rec, updatedAt: new Date().toISOString() },
                        $setOnInsert: { createdAt: new Date().toISOString() },
                    },
                    { upsert: true },
                );
            console.log(`[seed] mock day upserted: ${dateStr}`);
        }
    }

    await client.close();
    console.log("[seed] done.");
}

function buildMockDay(userId, date, dayOffset) {
    const meals = [
        {
            id: subId(),
            type: "breakfast",
            label: "Café da manhã",
            time: "07:30",
            foods: [
                { name: "Ovos mexidos (3 unidades)", weightGrams: 150, calories: 220, protein: 18, carbs: 2, fats: 15, fiber: 0 },
                { name: "Pão integral", weightGrams: 60, calories: 160, protein: 6, carbs: 30, fats: 2, fiber: 5 },
                { name: "Café preto", weightGrams: 200, calories: 5, protein: 0, carbs: 0, fats: 0, fiber: 0 },
            ],
            totalCalories: 385,
            totalWeight: 410,
            notes: "Sem açúcar.",
        },
        {
            id: subId(),
            type: "morning_snack",
            label: "Lanche da manhã",
            time: "10:00",
            foods: [
                { name: "Banana", weightGrams: 120, calories: 105, protein: 1, carbs: 27, fats: 0, fiber: 3 },
                { name: "Iogurte natural", weightGrams: 170, calories: 100, protein: 17, carbs: 7, fats: 0, fiber: 0 },
            ],
            totalCalories: 205,
            totalWeight: 290,
            notes: "",
        },
        {
            id: subId(),
            type: "lunch",
            label: "Almoço — frango grelhado",
            time: "12:45",
            foods: [
                { name: "Peito de frango grelhado", weightGrams: 180, calories: 297, protein: 56, carbs: 0, fats: 6, fiber: 0 },
                { name: "Arroz integral", weightGrams: 150, calories: 165, protein: 4, carbs: 35, fats: 1, fiber: 3 },
                { name: "Feijão preto", weightGrams: 100, calories: 130, protein: 8, carbs: 23, fats: 1, fiber: 8 },
                { name: "Brócolis cozido", weightGrams: 120, calories: 42, protein: 3, carbs: 8, fats: 0, fiber: 3 },
            ],
            totalCalories: 634,
            totalWeight: 550,
            notes: "Refeição completa.",
        },
        {
            id: subId(),
            type: "afternoon_snack",
            label: "Lanche da tarde",
            time: "16:00",
            foods: [
                { name: "Whey protein", weightGrams: 30, calories: 120, protein: 24, carbs: 3, fats: 1, fiber: 0 },
                { name: "Maçã", weightGrams: 180, calories: 95, protein: 0, carbs: 25, fats: 0, fiber: 4 },
            ],
            totalCalories: 215,
            totalWeight: 210,
            notes: "Pré-treino.",
        },
        {
            id: subId(),
            type: "post_workout",
            label: "Pós-treino",
            time: "18:30",
            foods: [
                { name: "Vitamina banana + aveia", weightGrams: 350, calories: 280, protein: 12, carbs: 50, fats: 4, fiber: 6 },
            ],
            totalCalories: 280,
            totalWeight: 350,
            notes: "Recuperação muscular.",
        },
        {
            id: subId(),
            type: "dinner",
            label: "Jantar — salmão",
            time: "20:30",
            foods: [
                { name: "Salmão grelhado", weightGrams: 150, calories: 312, protein: 30, carbs: 0, fats: 20, fiber: 0 },
                { name: "Batata-doce", weightGrams: 180, calories: 162, protein: 3, carbs: 38, fats: 0, fiber: 6 },
                { name: "Salada verde", weightGrams: 100, calories: 25, protein: 1, carbs: 5, fats: 0, fiber: 2 },
            ],
            totalCalories: 499,
            totalWeight: 430,
            notes: "Ômega 3.",
        },
    ];

    const totalCaloriesConsumed = meals.reduce((s, m) => s + m.totalCalories, 0);
    const totalProtein = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + (f.protein || 0), 0), 0);
    const totalCarbs = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + (f.carbs || 0), 0), 0);
    const totalFats = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + (f.fats || 0), 0), 0);
    const totalFiber = meals.reduce((s, m) => s + m.foods.reduce((a, f) => a + (f.fiber || 0), 0), 0);

    const workout = {
        id: subId(),
        startTime: "17:00",
        endTime: "18:00",
        totalDurationMinutes: 60,
        totalCaloriesBurned: 420,
        exercises: [
            {
                name: "Supino reto",
                category: "strength",
                muscleGroup: "chest",
                durationMinutes: 15,
                intensity: "high",
                sets: 4,
                reps: 10,
                weightKg: 60,
                estimatedCaloriesBurned: 150,
            },
            {
                name: "Remada curvada",
                category: "strength",
                muscleGroup: "back",
                durationMinutes: 15,
                intensity: "high",
                sets: 4,
                reps: 10,
                weightKg: 50,
                estimatedCaloriesBurned: 150,
            },
            {
                name: "Esteira (cardio)",
                category: "cardio",
                muscleGroup: "full_body",
                durationMinutes: 30,
                intensity: "moderate",
                estimatedCaloriesBurned: 120,
            },
        ],
        notes: "Treino A.",
    };

    const baseWeight = 78;
    const morning = {
        id: subId(),
        time: "morning",
        timestamp: `${date}T07:00:00.000Z`,
        data: {
            weight: { value: +(baseWeight - dayOffset * 0.05).toFixed(1), unit: "kg" },
            bmi: 24.5,
            bodyFatPercentage: { value: 18.2, unit: "%" },
            bodyFatMass: { value: 14.2, unit: "kg" },
            skeletalMuscleMassPercentage: { value: 44.5, unit: "%" },
            muscleMassRecord: { value: 44.5, unit: "%" },
            skeletalMuscleMass: { value: 34.7, unit: "kg" },
            muscleMass: { value: 62.3, unit: "kg" },
            waterPercentage: { value: 58.1, unit: "%" },
            waterMass: { value: 45.3, unit: "kg" },
            visceralFat: 8,
            boneMass: { value: 3.3, unit: "kg" },
            basalMetabolicRate: { value: 1720, unit: "kcal" },
            proteinPercentage: { value: 18.1, unit: "%" },
            obesityPercentage: { value: 105.0, unit: "%" },
            metabolicAge: { value: 28, unit: "years" },
        },
    };
    const evening = {
        id: subId(),
        time: "evening",
        timestamp: `${date}T22:00:00.000Z`,
        data: {
            weight: { value: +(baseWeight + 0.4 - dayOffset * 0.05).toFixed(1), unit: "kg" },
            bmi: 24.6,
            bodyFatPercentage: { value: 18.4, unit: "%" },
            bodyFatMass: { value: 14.4, unit: "kg" },
            skeletalMuscleMassPercentage: { value: 44.3, unit: "%" },
            muscleMassRecord: { value: 44.3, unit: "%" },
            skeletalMuscleMass: { value: 34.5, unit: "kg" },
            muscleMass: { value: 62.0, unit: "kg" },
            waterPercentage: { value: 57.8, unit: "%" },
            waterMass: { value: 45.1, unit: "kg" },
            visceralFat: 8,
            boneMass: { value: 3.3, unit: "kg" },
            basalMetabolicRate: { value: 1720, unit: "kcal" },
            proteinPercentage: { value: 18.0, unit: "%" },
            obesityPercentage: { value: 105.5, unit: "%" },
            metabolicAge: { value: 28, unit: "years" },
        },
    };

    const caloricGoal = 2000;
    const totalCaloriesBurned = workout.totalCaloriesBurned;
    const netCalories = totalCaloriesConsumed - totalCaloriesBurned;
    const caloricBalance = netCalories - caloricGoal;
    const isDeficit = caloricBalance < 0;
    const weightChange = +(evening.data.weight.value - morning.data.weight.value).toFixed(2);

    return {
        userId,
        date,
        bodyMeasurements: [morning, evening],
        meals,
        workout,
        water: {
            intake: { value: 2.4, unit: "l" },
            goal: { value: 3, unit: "l" },
        },
        caloricGoal,
        summary: {
            totalCaloriesConsumed: Math.round(totalCaloriesConsumed),
            totalCaloriesBurned: Math.round(totalCaloriesBurned),
            netCalories: Math.round(netCalories),
            caloricGoal,
            caloricBalance: Math.round(caloricBalance),
            isDeficit,
            deficitPercentage: Math.round((caloricBalance / caloricGoal) * 100),
            weightChange,
            waterPercentage: Math.round((2.4 / 3) * 100),
            totalProtein: +totalProtein.toFixed(1),
            totalCarbs: +totalCarbs.toFixed(1),
            totalFats: +totalFats.toFixed(1),
            totalFiber: +totalFiber.toFixed(1),
        },
        notes: "Dia de mock data — todos os períodos populados.",
    };
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
