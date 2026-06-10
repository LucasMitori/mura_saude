import { $fetch } from "ofetch";
import type {
    DailyRecord,
    Meal,
    BodyMeasurementEntry,
    WorkoutSession,
    VolumeUnit,
} from "#shared/types/daily";
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
        limit?: number,
    ): Promise<DailyRecord[]> {
        return await $fetch<DailyRecord[]>("/api/daily", {
            params: { from, to, limit },
            headers: headers(),
        });
    }

    async function saveDailyRecord(payload: Partial<DailyRecord>) {
        return await $fetch("/api/daily", {
            method: "POST",
            body: payload,
            headers: headers(),
        });
    }

    async function updateDailyMeta(
        id: string,
        fields: { notes?: string; caloricGoal?: number },
    ) {
        return await $fetch(`/api/daily/${id}`, {
            method: "PUT",
            body: fields,
            headers: headers(),
        });
    }

    async function deleteDailyRecord(id: string) {
        return await $fetch(`/api/daily/${id}`, {
            method: "DELETE",
            headers: headers(),
        });
    }

    async function addMeal(date: string, meal: Meal) {
        return await $fetch<{ success: boolean; mealId: string }>("/api/meals", {
            method: "POST",
            body: { date, meal },
            headers: headers(),
        });
    }

    async function updateMeal(date: string, mealId: string, meal: Meal) {
        return await $fetch(`/api/meals/${mealId}`, {
            method: "PUT",
            body: { date, meal },
            headers: headers(),
        });
    }

    async function deleteMeal(date: string, mealId: string) {
        return await $fetch(`/api/meals/${mealId}`, {
            method: "DELETE",
            body: { date },
            headers: headers(),
        });
    }

    async function searchMeals(params: {
        from?: string;
        to?: string;
        type?: string;
        search?: string;
    }) {
        return await $fetch<Array<{ date: string; meal: Meal }>>("/api/meals", {
            params,
            headers: headers(),
        });
    }

    async function addMeasurement(date: string, measurement: BodyMeasurementEntry) {
        return await $fetch<{ success: boolean; measurementId: string }>(
            "/api/measurements",
            {
                method: "POST",
                body: { date, measurement },
                headers: headers(),
            },
        );
    }

    async function updateMeasurement(
        date: string,
        measurementId: string,
        measurement: BodyMeasurementEntry,
    ) {
        return await $fetch(`/api/measurements/${measurementId}`, {
            method: "PUT",
            body: { date, measurement },
            headers: headers(),
        });
    }

    async function deleteMeasurement(date: string, measurementId: string) {
        return await $fetch(`/api/measurements/${measurementId}`, {
            method: "DELETE",
            body: { date },
            headers: headers(),
        });
    }

    async function updateWater(
        date: string,
        opts: {
            intake?: number;
            addMl?: number;
            goal?: { value: number; unit: VolumeUnit };
        },
    ) {
        return await $fetch("/api/water", {
            method: "PUT",
            body: { date, ...opts },
            headers: headers(),
        });
    }

    async function updateWorkout(date: string, workout: WorkoutSession | null) {
        return await $fetch("/api/workouts", {
            method: "PUT",
            body: { date, workout },
            headers: headers(),
        });
    }

    return {
        getDailyRecord,
        getDailyRecords,
        saveDailyRecord,
        updateDailyMeta,
        deleteDailyRecord,
        addMeal,
        updateMeal,
        deleteMeal,
        searchMeals,
        addMeasurement,
        updateMeasurement,
        deleteMeasurement,
        updateWater,
        updateWorkout,
    };
}
