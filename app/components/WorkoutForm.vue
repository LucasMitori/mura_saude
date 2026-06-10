<template>
    <v-card class="workout-form-card">
        <v-card-title class="d-flex align-center pa-4">
            <v-icon start color="red">mdi-dumbbell</v-icon>
            {{ existing ? "Editar Treino" : "Adicionar Treino" }}
            <v-spacer />
            <v-chip v-if="form.exercises.length" size="small" color="orange" variant="tonal">
                <v-icon start size="14">mdi-fire</v-icon>
                {{ totalCalories }} kcal
            </v-chip>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
            <v-row density="comfortable" class="mb-1">
                <v-col cols="6">
                    <AppTimeField v-model="form.startTime" label="Início" variant="outlined" density="comfortable" hide-details />
                </v-col>
                <v-col cols="6">
                    <AppTimeField v-model="form.endTime" label="Fim" variant="outlined" density="comfortable" hide-details />
                </v-col>
            </v-row>

            <v-select
                v-if="routines.length"
                v-model="selectedRoutine"
                :items="routines"
                item-title="name"
                item-value="_id"
                label="Aplicar uma rotina salva"
                prepend-inner-icon="mdi-clipboard-list-outline"
                density="comfortable"
                variant="outlined"
                hide-details
                clearable
                class="my-3"
                @update:model-value="applyRoutine"
            />

            <ExerciseListEditor v-model="form.exercises" />

            <v-textarea
                v-model="form.notes"
                label="Observações do treino"
                rows="2"
                variant="outlined"
                prepend-inner-icon="mdi-note-text-outline"
                hide-details
                class="mt-3"
            />
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
            <v-btn v-if="existing" color="error" variant="text" prepend-icon="mdi-delete" @click="$emit('clear')">
                Remover Treino
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="$emit('cancel')">Cancelar</v-btn>
            <v-btn
                color="primary"
                variant="elevated"
                prepend-icon="mdi-content-save"
                :disabled="form.exercises.length === 0"
                @click="submit"
            >
                Salvar Treino
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { WorkoutSession, Exercise } from "#shared/types/daily";
import type { WorkoutRoutine } from "#shared/types/workout-routine";

const props = defineProps<{ existing?: WorkoutSession | null }>();
const emit = defineEmits<{
    submit: [workout: WorkoutSession];
    cancel: [];
    clear: [];
}>();

const { listRoutines } = useRoutines();

const form = ref<{
    startTime: string;
    endTime: string;
    exercises: Exercise[];
    notes: string;
}>(
    props.existing
        ? JSON.parse(JSON.stringify({
              startTime: props.existing.startTime || "",
              endTime: props.existing.endTime || "",
              exercises: props.existing.exercises || [],
              notes: props.existing.notes || "",
          }))
        : { startTime: "", endTime: "", exercises: [], notes: "" },
);

const routines = ref<WorkoutRoutine[]>([]);
const selectedRoutine = ref<string | null>(null);

onMounted(async () => {
    try {
        routines.value = await listRoutines();
    } catch {
        routines.value = [];
    }
});

function applyRoutine(id: string | null) {
    if (!id) return;
    const routine = routines.value.find((r) => r._id === id);
    if (!routine) return;
    // Append the routine's exercises (deep-cloned) to the current list.
    const cloned = JSON.parse(JSON.stringify(routine.exercises || [])) as Exercise[];
    form.value.exercises = [...form.value.exercises, ...cloned];
    if (!form.value.notes && routine.name) form.value.notes = routine.name;
}

const totalCalories = computed(() =>
    Math.round(form.value.exercises.reduce((s, e) => s + (Number(e.estimatedCaloriesBurned) || 0), 0)),
);

function minutesBetween(start: string, end: string): number {
    const m = /^(\d{1,2}):(\d{2})$/;
    const a = m.exec(start);
    const b = m.exec(end);
    if (!a || !b) return 0;
    let mins = (Number(b[1]) * 60 + Number(b[2])) - (Number(a[1]) * 60 + Number(a[2]));
    if (mins < 0) mins += 24 * 60; // crossed midnight
    return mins;
}

function submit() {
    const fromExercises = form.value.exercises.reduce(
        (s, e) => s + (Number(e.durationMinutes) || 0),
        0,
    );
    const fromClock = minutesBetween(form.value.startTime, form.value.endTime);
    const workout: WorkoutSession = {
        id: props.existing?.id,
        startTime: form.value.startTime,
        endTime: form.value.endTime,
        totalDurationMinutes: fromClock || fromExercises,
        exercises: form.value.exercises,
        totalCaloriesBurned: totalCalories.value,
        notes: form.value.notes,
    };
    emit("submit", workout);
}
</script>
