import { $fetch } from "ofetch";
import type { DailyRecord, Meal, BodyMeasurement } from "#shared/types/daily";
import { useAuthStore } from "~/stores/auth.store";

export function useDaily() {
    const authStore = useAuthStore();

    function headers() {
        return authStore.authHeaders;
    }

    async function getDailyRecord(date: string): Promise<DailyRecord> {
        return await $fetch<DailyRecord>("/api/daily", {
            params: { date },
            headers: headers(),
        });
    }

    async function getDailyRecords(
        from?: string,
        to?: string,
    ): Promise<DailyRecord[]> {
        return await $fetch<DailyRecord[]>("/api/daily", {
            params: { from, to },
            headers: headers(),
        });
    }

    async function createDailyRecord(
        date: string,
        waterGoal: { value: number; unit: "l" | "ml" },
    ) {
        return await $fetch("/api/daily", {
            method: "POST",
            body: { date, waterGoal },
            headers: headers(),
        });
    }

    async function addMeal(date: string, meal: Meal) {
        return await $fetch("/api/meals", {
            method: "POST",
            body: { date, meal },
            headers: headers(),
        });
    }

    async function updateWaterIntake(date: string, intake: number) {
        return await $fetch("/api/water", {
            method: "PUT",
            body: { date, intake },
            headers: headers(),
        });
    }

    async function updateMeasurement(
        date: string,
        bodyMeasurement: BodyMeasurement,
    ) {
        return await $fetch("/api/measurements", {
            method: "POST",
            body: { date, bodyMeasurement },
            headers: headers(),
        });
    }

    return {
        getDailyRecord,
        getDailyRecords,
        createDailyRecord,
        addMeal,
        updateWaterIntake,
        updateMeasurement,
    };
}
