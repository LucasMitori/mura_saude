<template>
    <v-row>
        <v-col v-for="item in items" :key="item.label" cols="6" md="3">
            <div class="text-center pa-2">
                <p class="text-caption text-grey">{{ item.label }}</p>
                <p class="text-h6">{{ item.value }} {{ item.unit }}</p>
            </div>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { BodyMeasurement } from "../shared/types/daily";

const props = defineProps<{
    measurement: BodyMeasurement;
}>();

const items = computed(() => [
    { label: "Weight", value: props.measurement.weight.value, unit: "kg" },
    {
        label: "Body Fat",
        value: props.measurement.bodyFatPercentage.value,
        unit: "%",
    },
    {
        label: "Muscle Mass",
        value: props.measurement.muscleMass.value,
        unit: "kg",
    },
    {
        label: "Water",
        value: props.measurement.waterPercentage.value,
        unit: "%",
    },
    {
        label: "Visceral Fat",
        value: props.measurement.visceralFat.value,
        unit: "%",
    },
    { label: "Bone Mass", value: props.measurement.boneMass.value, unit: "kg" },
    {
        label: "BMR",
        value: props.measurement.basalMetabolicRate.value,
        unit: "kcal",
    },
    {
        label: "Metabolic Age",
        value: props.measurement.metabolicAge.value,
        unit: "yrs",
    },
]);
</script>
