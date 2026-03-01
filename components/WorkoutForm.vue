<template>
    <v-card>
        <v-card-title>Log Workout</v-card-title>
        <v-card-text>
            <v-select
                v-model="form.type"
                :items="workoutTypes"
                label="Workout Type"
            />
            <v-select
                v-model="form.intensity"
                :items="intensities"
                label="Intensity"
            />
            <v-text-field
                v-model.number="form.durationMinutes"
                label="Duration (minutes)"
                type="number"
            />
            <v-text-field
                v-model.number="form.caloriesBurned"
                label="Calories Burned"
                type="number"
            />
            <v-textarea
                v-model="form.notes"
                label="Notes (optional)"
                rows="2"
            />
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
import type {
    Workout,
    WorkoutType,
    WorkoutIntensity,
} from "../shared/types/daily";

const emit = defineEmits<{
    submit: [workout: Workout];
    cancel: [];
}>();

const workoutTypes: WorkoutType[] = ["cardio", "strength", "mixed", "mobility"];
const intensities: WorkoutIntensity[] = ["low", "moderate", "high"];

const form = ref({
    type: "strength" as WorkoutType,
    intensity: "moderate" as WorkoutIntensity,
    durationMinutes: 60,
    caloriesBurned: 0,
    notes: "",
});

function submit() {
    const workout: Workout = {
        type: form.value.type,
        intensity: form.value.intensity,
        durationMinutes: form.value.durationMinutes,
        caloriesBurned: form.value.caloriesBurned,
        notes: form.value.notes || undefined,
    };
    emit("submit", workout);
}
</script>
