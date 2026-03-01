<template>
    <div>
        <v-btn icon="mdi-arrow-left" variant="text" @click="$router.back()" />
        <h1 class="text-h4 mb-4 d-inline ml-2">{{ dateFormatted }}</h1>

        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

        <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" />
        </div>

        <div v-else-if="record">
            <v-row class="mb-4">
                <v-col cols="12">
                    <WaterTracker
                        :water="record.water"
                        @update="handleUpdateWater"
                    />
                </v-col>
            </v-row>

            <v-row class="mb-4">
                <v-col cols="12">
                    <v-card>
                        <v-card-title>
                            <v-icon start>mdi-food</v-icon>
                            Meals
                            <v-spacer />
                            <v-btn
                                color="primary"
                                size="small"
                                @click="showMealForm = true"
                            >
                                Add Meal
                            </v-btn>
                        </v-card-title>
                        <v-card-text>
                            <div v-if="record.meals.length === 0">
                                <p class="text-grey">No meals recorded yet.</p>
                            </div>
                            <MealCard
                                v-for="(meal, index) in record.meals"
                                :key="index"
                                :meal="meal"
                                class="mb-2"
                            />
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <v-row class="mb-4">
                <v-col cols="12">
                    <v-card>
                        <v-card-title>
                            <v-icon start>mdi-scale-bathroom</v-icon>
                            Body Measurements
                            <v-spacer />
                            <v-btn
                                color="primary"
                                size="small"
                                @click="showMeasurementForm = true"
                            >
                                {{ record.bodyMeasurement ? "Update" : "Add" }}
                            </v-btn>
                        </v-card-title>
                        <v-card-text>
                            <MeasurementCard
                                v-if="record.bodyMeasurement"
                                :measurement="record.bodyMeasurement"
                            />
                            <p v-else class="text-grey">
                                No measurements recorded.
                            </p>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </div>

        <v-dialog v-model="showMealForm" max-width="600">
            <MealForm @submit="handleAddMeal" @cancel="showMealForm = false" />
        </v-dialog>

        <v-dialog v-model="showMeasurementForm" max-width="600">
            <BodyMeasurementForm
                :existing="record?.bodyMeasurement ?? undefined"
                @submit="handleAddMeasurement"
                @cancel="showMeasurementForm = false"
            />
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { format, parseISO } from "date-fns";
import type { DailyRecord, Meal, BodyMeasurement } from "#shared/types/daily";

const route = useRoute();
const dateParam = route.params.date as string;
const dateFormatted = format(parseISO(dateParam), "EEEE, MMMM d, yyyy");

const { getDailyRecord, addMeal, updateWaterIntake, updateMeasurement } =
    useDaily();

const record = ref<DailyRecord | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showMealForm = ref(false);
const showMeasurementForm = ref(false);

async function fetchRecord() {
    loading.value = true;
    error.value = null;
    try {
        record.value = await getDailyRecord(dateParam);
    } catch (e: unknown) {
        error.value = e instanceof Error ? e.message : "Failed to load record";
    } finally {
        loading.value = false;
    }
}

async function handleUpdateWater(intake: number) {
    await updateWaterIntake(dateParam, intake);
    await fetchRecord();
}

async function handleAddMeal(meal: Meal) {
    await addMeal(dateParam, meal);
    showMealForm.value = false;
    await fetchRecord();
}

async function handleAddMeasurement(bodyMeasurement: BodyMeasurement) {
    await updateMeasurement(dateParam, bodyMeasurement);
    showMeasurementForm.value = false;
    await fetchRecord();
}

onMounted(fetchRecord);
</script>
