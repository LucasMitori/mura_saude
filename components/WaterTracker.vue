<template>
    <v-card>
        <v-card-title>
            <v-icon start>mdi-water</v-icon>
            Water Intake
        </v-card-title>
        <v-card-text>
            <div class="text-center mb-4">
                <p class="text-h3">
                    {{ water.intake.value }} / {{ water.goal.value }}
                    {{ water.goal.unit }}
                </p>
                <v-progress-linear
                    :model-value="percentage"
                    color="blue"
                    height="20"
                    rounded
                    class="mt-2"
                >
                    <template #default>
                        <strong>{{ Math.round(percentage) }}%</strong>
                    </template>
                </v-progress-linear>
            </div>

            <v-row justify="center">
                <v-col cols="auto" v-for="amount in quickAmounts" :key="amount">
                    <v-btn
                        color="blue"
                        variant="outlined"
                        @click="addWater(amount)"
                    >
                        +{{ amount }}{{ water.goal.unit }}
                    </v-btn>
                </v-col>
            </v-row>

            <v-row class="mt-2" justify="center">
                <v-col cols="6">
                    <v-text-field
                        v-model.number="customAmount"
                        label="Custom amount"
                        type="number"
                        density="compact"
                        hide-details
                    />
                </v-col>
                <v-col cols="auto">
                    <v-btn color="blue" @click="addWater(customAmount)">
                        Add
                    </v-btn>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { DailyWater } from "../shared/types/daily";

const props = defineProps<{
    water: DailyWater;
}>();

const emit = defineEmits<{
    update: [intake: number];
}>();

const customAmount = ref(0.5);

const percentage = computed(() => {
    if (props.water.goal.value === 0) return 0;
    return (props.water.intake.value / props.water.goal.value) * 100;
});

const quickAmounts = computed(() => {
    return props.water.goal.unit === "l" ? [0.25, 0.5, 1] : [250, 500, 1000];
});

function addWater(amount: number) {
    const newIntake = props.water.intake.value + amount;
    emit("update", newIntake);
}
</script>
