<template>
    <div class="exercise-editor">
        <ExerciseSearch class="mb-2" @select="onExerciseSelected" />
        <p class="text-caption text-medium-emphasis mb-3">
            <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
            Busque um exercício para adicionar (ou adicione manualmente) e ajuste
            séries, repetições, carga e intensidade.
        </p>

        <v-card
            v-for="(ex, i) in model"
            :key="i"
            variant="outlined"
            class="mb-2 ex-card"
        >
            <v-card-text class="pb-2">
                <div class="d-flex align-center mb-2">
                    <v-avatar color="red" variant="tonal" size="32" class="mr-2 flex-shrink-0">
                        <v-icon size="18">{{ catIcon(ex.category) }}</v-icon>
                    </v-avatar>
                    <v-text-field
                        v-model="ex.name"
                        density="compact"
                        variant="plain"
                        hide-details
                        placeholder="Nome do exercício"
                        class="ex-name"
                    />
                    <v-btn
                        icon="mdi-close"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click="remove(i)"
                    />
                </div>
                <v-row density="comfortable">
                    <v-col cols="6" sm="4">
                        <v-select
                            v-model="ex.muscleGroup"
                            :items="muscleOptions"
                            item-title="label"
                            item-value="value"
                            label="Músculo"
                            density="compact"
                            variant="outlined"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="6" sm="4">
                        <v-select
                            v-model="ex.category"
                            :items="categoryOptions"
                            item-title="label"
                            item-value="value"
                            label="Tipo"
                            density="compact"
                            variant="outlined"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="6" sm="4">
                        <v-select
                            v-model="ex.intensity"
                            :items="intensityOptions"
                            item-title="label"
                            item-value="value"
                            label="Intensidade"
                            density="compact"
                            variant="outlined"
                            hide-details
                            @update:model-value="autoCalories(ex)"
                        />
                    </v-col>
                    <v-col cols="4" sm="2">
                        <v-text-field v-model.number="ex.sets" type="number" label="Séries" density="compact" variant="outlined" hide-details />
                    </v-col>
                    <v-col cols="4" sm="2">
                        <v-text-field v-model.number="ex.reps" type="number" label="Reps" density="compact" variant="outlined" hide-details />
                    </v-col>
                    <v-col cols="4" sm="2">
                        <v-text-field v-model.number="ex.weightKg" type="number" label="Carga" suffix="kg" density="compact" variant="outlined" hide-details />
                    </v-col>
                    <v-col cols="6" sm="3">
                        <v-text-field v-model.number="ex.durationMinutes" type="number" label="Duração" suffix="min" density="compact" variant="outlined" hide-details @update:model-value="autoCalories(ex)" />
                    </v-col>
                    <v-col cols="6" sm="3">
                        <v-text-field v-model.number="ex.estimatedCaloriesBurned" type="number" label="Calorias" suffix="kcal" density="compact" variant="outlined" hide-details />
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <div v-if="model.length === 0" class="text-center text-medium-emphasis py-4">
            Nenhum exercício ainda. Busque acima ou adicione manualmente.
        </div>

        <div class="d-flex align-center mt-2 flex-wrap ga-2">
            <v-btn variant="tonal" size="small" color="primary" prepend-icon="mdi-plus" @click="addBlank">
                Adicionar exercício
            </v-btn>
            <v-spacer />
            <v-chip v-if="model.length" size="small" color="orange" variant="tonal">
                <v-icon start size="14">mdi-fire</v-icon>
                {{ totalCalories }} kcal · {{ totalDuration }} min
            </v-chip>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
    Exercise,
    ExerciseCategory,
    MuscleGroup,
    WorkoutIntensity,
} from "#shared/types/daily";
import { MUSCLE_GROUP_LABELS } from "#shared/types/daily";
import type { ExerciseSuggestion } from "#shared/types/workout-routine";

const model = defineModel<Exercise[]>({ default: () => [] });

const muscleOptions = (Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((value) => ({
    value,
    label: MUSCLE_GROUP_LABELS[value],
}));

const categoryOptions: { value: ExerciseCategory; label: string }[] = [
    { value: "strength", label: "Força" },
    { value: "cardio", label: "Cardio" },
    { value: "flexibility", label: "Flexibilidade" },
    { value: "sport", label: "Esporte" },
];

const intensityOptions: { value: WorkoutIntensity; label: string }[] = [
    { value: "low", label: "Baixa" },
    { value: "moderate", label: "Moderada" },
    { value: "high", label: "Alta" },
    { value: "very_high", label: "Muito Alta" },
];

function catIcon(category: ExerciseCategory): string {
    const map: Record<ExerciseCategory, string> = {
        strength: "mdi-weight-lifter",
        cardio: "mdi-run-fast",
        flexibility: "mdi-yoga",
        sport: "mdi-basketball",
    };
    return map[category] || "mdi-dumbbell";
}

// Rough kcal estimate (MET-based, ~75kg) used as an editable default.
function estimateCalories(ex: Exercise): number {
    const dur = Number(ex.durationMinutes) || 0;
    const metByIntensity: Record<WorkoutIntensity, number> = {
        low: 3,
        moderate: 5,
        high: 8,
        very_high: 10,
    };
    const met = metByIntensity[ex.intensity] || 5;
    if (dur > 0) return Math.round((met * 3.5 * 75) / 200 * dur);
    // No duration (typical strength set logging): estimate from sets.
    const sets = Number(ex.sets) || 0;
    return Math.round(sets * met * 2);
}

function autoCalories(ex: Exercise) {
    ex.estimatedCaloriesBurned = estimateCalories(ex);
}

function guessMuscleGroup(wgerCategory: string): MuscleGroup {
    const map: Record<string, MuscleGroup> = {
        abs: "abs",
        arms: "biceps",
        back: "back",
        calves: "calves",
        cardio: "full_body",
        chest: "chest",
        legs: "quadriceps",
        shoulders: "shoulders",
    };
    return map[wgerCategory.toLowerCase()] || "other";
}

function guessCategory(wgerCategory: string): ExerciseCategory {
    return wgerCategory.toLowerCase() === "cardio" ? "cardio" : "strength";
}

function blankExercise(): Exercise {
    return {
        name: "",
        category: "strength",
        muscleGroup: "other",
        durationMinutes: 0,
        intensity: "moderate",
        estimatedCaloriesBurned: 0,
        sets: undefined,
        reps: undefined,
        weightKg: undefined,
        notes: "",
    };
}

function addBlank() {
    model.value.push(blankExercise());
}

function remove(i: number) {
    model.value.splice(i, 1);
}

function onExerciseSelected(s: ExerciseSuggestion) {
    const ex: Exercise = {
        ...blankExercise(),
        name: s.name,
        category: guessCategory(s.category),
        muscleGroup: guessMuscleGroup(s.category),
    };
    autoCalories(ex);
    model.value.push(ex);
}

const totalCalories = computed(() =>
    Math.round(model.value.reduce((s, e) => s + (Number(e.estimatedCaloriesBurned) || 0), 0)),
);
const totalDuration = computed(() =>
    Math.round(model.value.reduce((s, e) => s + (Number(e.durationMinutes) || 0), 0)),
);
</script>

<style scoped>
.ex-card {
    transition: border-color 0.15s ease;
}
.ex-card:hover {
    border-color: rgba(239, 83, 80, 0.5);
}
.ex-name :deep(input) {
    font-weight: 600;
}
</style>
