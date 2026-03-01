import { $fetch } from "ofetch";
import type { BodyMeasurement } from "#shared/types/daily";
import { useAuthStore } from "~/stores/auth.store";

interface MeasurementRecord {
    date: string;
    bodyMeasurement: BodyMeasurement;
}

export function useMeasurements() {
    const authStore = useAuthStore();

    async function getMeasurementHistory(
        from?: string,
        to?: string,
        limit?: number,
    ): Promise<MeasurementRecord[]> {
        return await $fetch<MeasurementRecord[]>("/api/measurements", {
            params: { from, to, limit },
            headers: authStore.authHeaders,
        });
    }

    return {
        getMeasurementHistory,
    };
}
