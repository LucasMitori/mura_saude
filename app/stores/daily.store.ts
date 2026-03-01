import { defineStore } from "pinia";
import { $fetch } from "ofetch";
import type { DailyRecord, Meal } from "#shared/types/daily";

export const useDailyStore = defineStore("daily", {
    state: () => ({
        currentRecord: null as DailyRecord | null,
        loading: false,
        error: null as string | null,
    }),
    actions: {
        async fetchDaily(date: string) {
            this.loading = true;
            this.error = null;
            try {
                const data = await $fetch<DailyRecord>("/api/daily", {
                    params: { userId: "lucas", date },
                });
                this.currentRecord = data;
            } catch (e: unknown) {
                if (e instanceof Error) {
                    this.error = e.message;
                } else {
                    this.error = "An unknown error occurred";
                }
            } finally {
                this.loading = false;
            }
        },
        async addMeal(date: string, meal: Meal) {
            await $fetch("/api/meals", {
                method: "POST",
                body: { userId: "lucas", date, meal },
            });
            await this.fetchDaily(date);
        },
    },
});
