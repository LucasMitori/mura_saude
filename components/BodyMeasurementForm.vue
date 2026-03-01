<template>
    <v-card>
        <v-card-title>Body Measurements</v-card-title>
        <v-card-text>
            <v-row>
                <v-col cols="6">
                    <v-text-field
                        v-model.number="form.weight"
                        label="Weight (kg)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        v-model.number="form.bodyFatPercentage"
                        label="Body Fat (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        v-model.number="form.muscleMass"
                        label="Muscle Mass (kg)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        v-model.number="form.waterPercentage"
                        label="Water (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        v-model.number="form.visceralFat"
                        label="Visceral Fat (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        v-model.number="form.boneMass"
                        label="Bone Mass (kg)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        v-model.number="form.basalMetabolicRate"
                        label="Basal Metabolic Rate (kcal)"
                        type="number"
                    />
                </v-col>
                <v-col cols="6">
                    <v-text-field
                        v-model.number="form.metabolicAge"
                        label="Metabolic Age (years)"
                        type="number"
                    />
                </v-col>
            </v-row>
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn @click="$emit('cancel')">Cancel</v-btn>
            <v-btn color="primary" @click="submit">Save</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { BodyMeasurement } from "../shared/types/daily";

const props = defineProps<{
    existing?: BodyMeasurement;
}>();

const emit = defineEmits<{
    submit: [measurement: BodyMeasurement];
    cancel: [];
}>();

const form = ref({
    weight: props.existing?.weight.value ?? 0,
    bodyFatPercentage: props.existing?.bodyFatPercentage.value ?? 0,
    muscleMass: props.existing?.muscleMass.value ?? 0,
    waterPercentage: props.existing?.waterPercentage.value ?? 0,
    visceralFat: props.existing?.visceralFat.value ?? 0,
    boneMass: props.existing?.boneMass.value ?? 0,
    basalMetabolicRate: props.existing?.basalMetabolicRate.value ?? 0,
    metabolicAge: props.existing?.metabolicAge.value ?? 0,
});

function submit() {
    const measurement: BodyMeasurement = {
        weight: { value: form.value.weight, unit: "kg" },
        bodyFatPercentage: { value: form.value.bodyFatPercentage, unit: "%" },
        muscleMass: { value: form.value.muscleMass, unit: "kg" },
        waterPercentage: { value: form.value.waterPercentage, unit: "%" },
        visceralFat: { value: form.value.visceralFat, unit: "%" },
        boneMass: { value: form.value.boneMass, unit: "kg" },
        basalMetabolicRate: {
            value: form.value.basalMetabolicRate,
            unit: "kcal",
        },
        metabolicAge: { value: form.value.metabolicAge, unit: "years" },
    };
    emit("submit", measurement);
}
</script>
