<template>
    <v-card class="water-tracker" variant="elevated">
        <v-card-title class="d-flex align-center pa-4">
            <v-icon start color="info">mdi-water</v-icon>
            Hidratação
            <v-spacer />
            <v-chip color="info" variant="tonal" size="small">
                {{ Math.round(percentage) }}%
            </v-chip>
        </v-card-title>

        <v-card-text class="pa-4">
            <div class="text-center mb-4">
                <p class="text-h4 font-weight-bold">
                    {{ water.intake.value }}
                    <span class="text-h6 text-grey">/ {{ water.goal.value }} {{ water.goal.unit }}</span>
                </p>
                <v-progress-linear
                    :model-value="percentage"
                    :color="percentageColor"
                    height="24"
                    rounded
                    class="mt-2"
                >
                    <template #default>
                        <strong>{{ Math.round(percentage) }}%</strong>
                    </template>
                </v-progress-linear>
            </div>

            <v-row density="comfortable" justify="center">
                <v-col v-for="amount in quickAmounts" :key="amount" cols="auto">
                    <v-btn
                        color="info"
                        variant="tonal"
                        size="small"
                        @click="$emit('add', amount)"
                    >
                        +{{ amount }}{{ water.goal.unit }}
                    </v-btn>
                </v-col>
            </v-row>

            <v-row density="comfortable" class="mt-2" align="center">
                <v-col cols="6">
                    <v-text-field
                        v-model.number="customAmount"
                        label="Custom"
                        type="number"
                        step="0.1"
                        density="compact"
                        hide-details
                    />
                </v-col>
                <v-col cols="3">
                    <v-btn
                        block
                        color="info"
                        size="small"
                        :disabled="!customAmount"
                        @click="$emit('add', customAmount)"
                    >
                        Add
                    </v-btn>
                </v-col>
                <v-col cols="3">
                    <v-btn
                        block
                        variant="text"
                        color="error"
                        size="small"
                        @click="$emit('reset')"
                    >
                        Zerar
                    </v-btn>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { DailyWater } from "#shared/types/daily";

const props = defineProps<{
    water: DailyWater;
}>();

defineEmits<{
    add: [amount: number];
    reset: [];
}>();

const customAmount = ref(0.5);

const percentage = computed(() => {
    if (props.water.goal.value <= 0) return 0;
    return Math.min(
        Math.round((props.water.intake.value / props.water.goal.value) * 100),
        100,
    );
});

const percentageColor = computed(() => {
    if (percentage.value < 30) return "error";
    if (percentage.value < 60) return "warning";
    if (percentage.value < 100) return "info";
    return "success";
});

const quickAmounts = computed(() => {
    return props.water.goal.unit === "l" ? [0.25, 0.5, 1] : [250, 500, 1000];
});
</script>

<style scoped>
.water-tracker {
    border-radius: 16px;
}
</style>
