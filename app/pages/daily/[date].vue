<template>
    <div class="daily-detail">
        <div class="d-flex align-center mb-4 flex-wrap ga-2">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold">{{ dateFormatted }}</h1>
                <p class="text-body-2 text-grey">
                    {{ weekday }}
                </p>
            </div>
            <v-spacer />
            <v-chip v-if="record" color="success" variant="tonal">
                <v-icon start size="14">mdi-check-circle</v-icon>
                Registrado
            </v-chip>
            <v-btn
                v-if="authStore.can('nutrition.edit') && record?._id"
                variant="text"
                color="error"
                prepend-icon="mdi-delete"
                @click="confirmDeleteDay"
            >
                Excluir Dia
            </v-btn>
            <v-btn
                icon="mdi-arrow-left"
                variant="tonal"
                @click="$router.back()"
            />
        </div>

        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

        <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="64" />
        </div>

        <template v-else-if="record">
            <!-- Summary Stats -->
            <v-row class="mb-2">
                <v-col
                    v-for="card in summaryCards"
                    :key="card.title"
                    cols="12"
                    sm="6"
                    md="3"
                >
                    <v-card
                        variant="tonal"
                        :color="card.color"
                        class="summary-card h-100"
                    >
                        <v-card-text class="d-flex align-center ga-4 py-4">
                            <v-avatar
                                :color="card.color"
                                variant="flat"
                                size="52"
                                class="summary-icon flex-shrink-0"
                            >
                                <v-icon size="28" color="white">{{ card.icon }}</v-icon>
                            </v-avatar>
                            <div class="flex-grow-1" style="min-width: 0">
                                <p class="text-subtitle-1 font-weight-bold mb-0">
                                    {{ card.title }}
                                </p>
                                <p class="text-caption font-weight-medium mb-0">
                                    {{ card.subtitle }}
                                </p>
                                <p class="text-caption text-medium-emphasis summary-desc">
                                    {{ card.description }}
                                </p>
                                <p class="text-h5 font-weight-bold mt-1 mb-0">
                                    {{ card.value
                                    }}<span class="text-caption font-weight-regular ml-1">
                                        {{ card.unit }}
                                    </span>
                                </p>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <v-row>
                <v-col cols="12" md="8">
                    <!-- Meals -->
                    <v-card class="mb-3">
                        <v-card-title class="d-flex align-center pa-4">
                            <v-icon start>mdi-food</v-icon>
                            Refeições ({{ record.meals.length }})
                            <v-spacer />
                            <v-btn
                                v-if="authStore.can('nutrition.edit')"
                                color="primary"
                                prepend-icon="mdi-plus"
                                size="small"
                                @click="openMealForm(null)"
                            >
                                Adicionar Refeição
                            </v-btn>
                        </v-card-title>
                        <v-divider />
                        <v-card-text>
                            <div v-if="record.meals.length === 0" class="text-center text-grey py-6">
                                <v-icon size="48" color="grey">mdi-silverware</v-icon>
                                <p class="mt-2">Nenhuma refeição registrada ainda.</p>
                            </div>
                            <transition-group name="fade-list" tag="div">
                                <DailyMealCard
                                    v-for="meal in sortedMeals"
                                    :key="meal.id ?? meal.time"
                                    :meal="meal"
                                    :editable="authStore.can('nutrition.edit')"
                                    class="mb-3"
                                    @edit="openMealForm($event)"
                                    @delete="confirmDeleteMeal($event)"
                                />
                            </transition-group>
                        </v-card-text>
                    </v-card>

                    <!-- Workout -->
                    <v-card class="mb-3">
                        <v-card-title class="d-flex align-center pa-4">
                            <v-icon start>mdi-dumbbell</v-icon>
                            Treino
                            <v-spacer />
                            <v-btn
                                v-if="authStore.can('nutrition.edit')"
                                color="primary"
                                size="small"
                                :prepend-icon="record.workout ? 'mdi-pencil' : 'mdi-plus'"
                                @click="openWorkoutForm"
                            >
                                {{ record.workout ? "Editar" : "Adicionar" }}
                            </v-btn>
                        </v-card-title>
                        <v-divider />
                        <v-card-text v-if="record.workout">
                            <div class="d-flex flex-wrap ga-2 mb-3">
                                <v-chip color="red" variant="tonal" size="small">
                                    <v-icon start size="16">mdi-timer-outline</v-icon>
                                    {{ record.workout.totalDurationMinutes }} min
                                </v-chip>
                                <v-chip color="orange" variant="tonal" size="small">
                                    <v-icon start size="16">mdi-fire</v-icon>
                                    {{ record.workout.totalCaloriesBurned }} kcal
                                </v-chip>
                                <v-chip color="info" variant="tonal" size="small">
                                    <v-icon start size="16">mdi-format-list-numbered</v-icon>
                                    {{ record.workout.exercises.length }} exercícios
                                </v-chip>
                            </div>
                            <v-list density="compact" class="py-0 bg-transparent">
                                <v-list-item
                                    v-for="(ex, i) in record.workout.exercises"
                                    :key="i"
                                    class="px-0 exercise-row"
                                    rounded="lg"
                                >
                                    <template #prepend>
                                        <v-avatar color="red" variant="tonal" size="38" class="mr-3">
                                            <v-icon size="20">{{ exerciseIcon(ex.category) }}</v-icon>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title class="font-weight-medium">
                                        {{ ex.name }}
                                    </v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ muscleLabel(ex.muscleGroup) }}
                                        <template v-if="ex.sets && ex.reps">
                                            · {{ ex.sets }}×{{ ex.reps }}</template>
                                        <template v-if="ex.weightKg">
                                            · {{ ex.weightKg }}kg</template>
                                        <template v-else-if="ex.durationMinutes">
                                            · {{ ex.durationMinutes }}min</template>
                                    </v-list-item-subtitle>
                                    <template #append>
                                        <div class="text-right">
                                            <v-chip
                                                size="x-small"
                                                :color="intensityColor(ex.intensity)"
                                                variant="tonal"
                                            >
                                                {{ intensityLabel(ex.intensity) }}
                                            </v-chip>
                                            <p class="text-caption text-medium-emphasis mt-1 mb-0">
                                                {{ ex.estimatedCaloriesBurned }} kcal
                                            </p>
                                        </div>
                                    </template>
                                </v-list-item>
                            </v-list>
                            <p
                                v-if="record.workout.notes"
                                class="text-caption text-medium-emphasis mt-2 mb-0"
                            >
                                <v-icon size="14" class="mr-1">mdi-note-text-outline</v-icon>
                                {{ record.workout.notes }}
                            </p>
                        </v-card-text>
                        <v-card-text v-else>
                            <p class="text-grey">Sem treino registrado.</p>
                        </v-card-text>
                    </v-card>

                    <!-- Notes -->
                    <v-card>
                        <v-card-title class="pa-4">
                            <v-icon start>mdi-note-text</v-icon>
                            Observações do Dia
                        </v-card-title>
                        <v-divider />
                        <v-card-text>
                            <v-textarea
                                v-model="noteEdits"
                                :readonly="!authStore.can('nutrition.edit')"
                                placeholder="Sem observações"
                                rows="3"
                                hide-details
                                @blur="saveNotes"
                            />
                        </v-card-text>
                    </v-card>
                </v-col>

                <v-col cols="12" md="4">
                    <!-- Water -->
                    <WaterTracker
                        v-if="record"
                        :water="record.water"
                        class="mb-3"
                        @add="handleAddWater"
                        @reset="handleResetWater"
                    />

                    <!-- Body Measurements -->
                    <v-card class="mb-3">
                        <v-card-title class="d-flex align-center pa-4">
                            <v-icon start>mdi-scale-bathroom</v-icon>
                            Bioimpedância
                            <v-spacer />
                            <v-btn
                                v-if="authStore.can('nutrition.edit')"
                                color="primary"
                                size="small"
                                prepend-icon="mdi-plus"
                                @click="openMeasurementForm(null)"
                            >
                                Add
                            </v-btn>
                        </v-card-title>
                        <v-divider />
                        <v-card-text v-if="record.bodyMeasurements.length === 0" class="text-center py-4">
                            <p class="text-grey">Nenhuma medição registrada.</p>
                        </v-card-text>
                        <v-card-text v-else>
                            <transition-group name="fade-list" tag="div">
                                <DailyMeasurementCard
                                    v-for="m in record.bodyMeasurements"
                                    :key="m.id ?? m.timestamp"
                                    :entry="m"
                                    :editable="authStore.can('nutrition.edit')"
                                    class="mb-2"
                                    @edit="openMeasurementForm($event)"
                                    @delete="confirmDeleteMeasurement($event)"
                                />
                            </transition-group>
                        </v-card-text>
                    </v-card>

                    <!-- Macros -->
                    <v-card>
                        <v-card-title class="pa-4">
                            <v-icon start>mdi-chart-pie</v-icon>
                            Macronutrientes
                        </v-card-title>
                        <v-divider />
                        <v-card-text>
                            <div class="mb-3">
                                <div class="d-flex justify-space-between">
                                    <span>Proteína</span>
                                    <strong>{{ summary.totalProtein }}g</strong>
                                </div>
                                <v-progress-linear
                                    :model-value="macroPct(summary.totalProtein)"
                                    color="red"
                                    height="6"
                                    rounded
                                />
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-space-between">
                                    <span>Carboidratos</span>
                                    <strong>{{ summary.totalCarbs }}g</strong>
                                </div>
                                <v-progress-linear
                                    :model-value="macroPct(summary.totalCarbs)"
                                    color="amber"
                                    height="6"
                                    rounded
                                />
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-space-between">
                                    <span>Gorduras</span>
                                    <strong>{{ summary.totalFats }}g</strong>
                                </div>
                                <v-progress-linear
                                    :model-value="macroPct(summary.totalFats)"
                                    color="blue"
                                    height="6"
                                    rounded
                                />
                            </div>
                            <div>
                                <div class="d-flex justify-space-between">
                                    <span>Fibra</span>
                                    <strong>{{ summary.totalFiber }}g</strong>
                                </div>
                                <v-progress-linear
                                    :model-value="macroPct(summary.totalFiber)"
                                    color="green"
                                    height="6"
                                    rounded
                                />
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <v-alert v-else type="info" class="mt-4">
            Nenhum registro para esta data.
            <template v-if="authStore.can('nutrition.edit')">
                <v-btn
                    color="primary"
                    variant="text"
                    class="ml-2"
                    @click="goToFullEntry"
                >
                    Criar agora
                </v-btn>
            </template>
        </v-alert>

        <!-- Meal Form Dialog -->
        <v-dialog v-model="showMealForm" max-width="1100" scrollable>
            <MealForm
                :existing="editingMeal"
                @submit="handleSubmitMeal"
                @cancel="showMealForm = false"
            />
        </v-dialog>

        <!-- Measurement Form Dialog -->
        <v-dialog v-model="showMeasurementForm" max-width="900" scrollable>
            <BodyMeasurementForm
                :existing="editingMeasurement"
                @submit="handleSubmitMeasurement"
                @cancel="showMeasurementForm = false"
            />
        </v-dialog>

        <!-- Workout Form Dialog -->
        <v-dialog v-model="showWorkoutForm" max-width="900" scrollable>
            <WorkoutForm
                :existing="record?.workout ?? null"
                @submit="handleSubmitWorkout"
                @clear="handleClearWorkout"
                @cancel="showWorkoutForm = false"
            />
        </v-dialog>

        <!-- Confirm Dialog -->
        <v-dialog v-model="confirmDialog.show" max-width="420">
            <v-card>
                <v-card-title>{{ confirmDialog.title }}</v-card-title>
                <v-card-text>{{ confirmDialog.message }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="confirmDialog.show = false">Cancelar</v-btn>
                    <v-btn
                        color="error"
                        variant="elevated"
                        @click="confirmDialog.onConfirm"
                    >
                        Confirmar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            timeout="3000"
            location="bottom"
        >
            {{ snackbar.message }}
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
    DailyRecord,
    Meal,
    BodyMeasurementEntry,
    MuscleGroup,
    ExerciseCategory,
    WorkoutIntensity,
    WorkoutSession,
} from "#shared/types/daily";
import { MUSCLE_GROUP_LABELS } from "#shared/types/daily";
import { useAuthStore } from "~/stores/auth.store";
// Imported explicitly with distinct filenames. The originals were Mealcard.vue /
// Measurementcard.vue, whose lowercase auto-import names didn't match the
// PascalCase tags. Renaming case-only is unreliable on case-insensitive
// filesystems, so these use fresh names + explicit imports.
import DailyMealCard from "~/components/DailyMealCard.vue";
import DailyMeasurementCard from "~/components/DailyMeasurementCard.vue";

const route = useRoute();
const dateParam = route.params.date as string;
const authStore = useAuthStore();
const {
    getDailyRecord,
    addMeal,
    updateMeal,
    deleteMeal,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    updateWater,
    updateWorkout,
    updateDailyMeta,
    deleteDailyRecord,
} = useDaily();
const { uploadMealImage, removeMealImage } = useMealImages();

const record = ref<DailyRecord | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const noteEdits = ref("");

const showMealForm = ref(false);
const editingMeal = ref<Meal | null>(null);

const showMeasurementForm = ref(false);
const editingMeasurement = ref<BodyMeasurementEntry | null>(null);

const showWorkoutForm = ref(false);

const snackbar = ref({ show: false, message: "", color: "success" });
function notify(message: string, color: "success" | "error" | "info" = "success") {
    snackbar.value = { show: true, message, color };
}

const confirmDialog = ref<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
});

const dateFormatted = computed(() => {
    try {
        return format(parseISO(dateParam), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
        return dateParam;
    }
});
const weekday = computed(() => {
    try {
        return format(parseISO(dateParam), "EEEE", { locale: ptBR });
    } catch {
        return "";
    }
});

const summary = computed(() => {
    return (record.value?.summary as Record<string, number | boolean | null>) || {
        totalCaloriesConsumed: 0,
        totalCaloriesBurned: 0,
        netCalories: 0,
        caloricBalance: 0,
        isDeficit: true,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        totalFiber: 0,
    };
});

const sortedMeals = computed(() => {
    if (!record.value) return [];
    return [...record.value.meals].sort((a, b) =>
        (a.time || "").localeCompare(b.time || ""),
    );
});

const summaryCards = computed(() => {
    const s = summary.value;
    const deficit = s.isDeficit as boolean;
    const balance = (s.caloricBalance as number) ?? 0;
    return [
        {
            icon: "mdi-fire",
            color: "warning",
            title: "Consumido",
            subtitle: "Calorias ingeridas",
            description: "Soma de todas as refeições do dia",
            value: s.totalCaloriesConsumed ?? 0,
            unit: "kcal",
        },
        {
            icon: "mdi-dumbbell",
            color: "error",
            title: "Queimado",
            subtitle: "Gasto no treino",
            description: "Calorias queimadas em exercícios",
            value: s.totalCaloriesBurned ?? 0,
            unit: "kcal",
        },
        {
            icon: "mdi-target",
            color: "info",
            title: "Meta",
            subtitle: "Objetivo diário",
            description: "Meta calórica definida para o dia",
            value: record.value?.caloricGoal ?? 0,
            unit: "kcal",
        },
        {
            icon: deficit ? "mdi-trending-down" : "mdi-trending-up",
            color: deficit ? "success" : "error",
            title: "Balanço",
            subtitle: deficit ? "Déficit calórico" : "Superávit calórico",
            description: "Consumido − queimado − meta",
            value: `${balance >= 0 ? "+" : ""}${balance}`,
            unit: "kcal",
        },
    ];
});

function muscleLabel(g: MuscleGroup): string {
    return MUSCLE_GROUP_LABELS[g] || g;
}
function exerciseIcon(category: ExerciseCategory): string {
    const map: Record<ExerciseCategory, string> = {
        strength: "mdi-weight-lifter",
        cardio: "mdi-run-fast",
        flexibility: "mdi-yoga",
        sport: "mdi-basketball",
    };
    return map[category] || "mdi-dumbbell";
}
function intensityLabel(i: WorkoutIntensity): string {
    const map: Record<WorkoutIntensity, string> = {
        low: "Baixa",
        moderate: "Moderada",
        high: "Alta",
        very_high: "Muito Alta",
    };
    return map[i] || i;
}
function intensityColor(i: WorkoutIntensity): string {
    const map: Record<WorkoutIntensity, string> = {
        low: "green",
        moderate: "amber",
        high: "orange",
        very_high: "red",
    };
    return map[i] || "grey";
}

function macroPct(value: number): number {
    const total =
        (summary.value.totalProtein as number) +
        (summary.value.totalCarbs as number) +
        (summary.value.totalFats as number);
    if (!total) return 0;
    return Math.round((value / total) * 100);
}

async function fetchRecord() {
    loading.value = true;
    error.value = null;
    try {
        record.value = await getDailyRecord(dateParam);
        noteEdits.value = record.value?.notes || "";
    } catch (e: unknown) {
        const err = e as { status?: number; statusCode?: number; message?: string };
        if (err.status === 404 || err.statusCode === 404) {
            record.value = null;
        } else {
            error.value = err.message || "Erro ao carregar registro";
        }
    } finally {
        loading.value = false;
    }
}

function openMealForm(meal: Meal | null) {
    editingMeal.value = meal;
    showMealForm.value = true;
}

async function handleSubmitMeal(
    meal: Meal,
    image: { file: File | null; remove: boolean },
) {
    try {
        let mealId = meal.id;
        if (mealId) {
            await updateMeal(dateParam, mealId, meal);
        } else {
            const res = await addMeal(dateParam, meal);
            mealId = res.mealId;
        }
        // Photo changes are separate calls — the meal is already saved even if
        // the image step fails, so report that failure without rolling back.
        if (mealId) {
            try {
                if (image.file) {
                    await uploadMealImage(dateParam, mealId, image.file);
                } else if (image.remove && meal.image) {
                    await removeMealImage(dateParam, mealId);
                }
            } catch (imgErr) {
                notify(`Refeição salva, mas a foto falhou: ${getErrorMessage(imgErr)}`, "error");
                showMealForm.value = false;
                await fetchRecord();
                return;
            }
        }
        notify(meal.id ? "Refeição atualizada" : "Refeição adicionada");
        showMealForm.value = false;
        await fetchRecord();
    } catch (e) {
        notify(getErrorMessage(e), "error");
    }
}

function confirmDeleteMeal(meal: Meal) {
    confirmDialog.value = {
        show: true,
        title: "Excluir refeição?",
        message: `Tem certeza que deseja excluir "${meal.label || meal.type}"?`,
        onConfirm: async () => {
            confirmDialog.value.show = false;
            if (!meal.id) return;
            try {
                await deleteMeal(dateParam, meal.id);
                notify("Refeição excluída");
                await fetchRecord();
            } catch (e) {
                notify(getErrorMessage(e), "error");
            }
        },
    };
}

function openMeasurementForm(m: BodyMeasurementEntry | null) {
    editingMeasurement.value = m;
    showMeasurementForm.value = true;
}

async function handleSubmitMeasurement(m: BodyMeasurementEntry) {
    try {
        if (m.id) {
            await updateMeasurement(dateParam, m.id, m);
            notify("Medição atualizada");
        } else {
            await addMeasurement(dateParam, m);
            notify("Medição adicionada");
        }
        showMeasurementForm.value = false;
        await fetchRecord();
    } catch (e) {
        notify(getErrorMessage(e), "error");
    }
}

function confirmDeleteMeasurement(m: BodyMeasurementEntry) {
    confirmDialog.value = {
        show: true,
        title: "Excluir medição?",
        message: "Tem certeza que deseja excluir esta medição?",
        onConfirm: async () => {
            confirmDialog.value.show = false;
            if (!m.id) return;
            try {
                await deleteMeasurement(dateParam, m.id);
                notify("Medição excluída");
                await fetchRecord();
            } catch (e) {
                notify(getErrorMessage(e), "error");
            }
        },
    };
}

async function handleAddWater(amount: number) {
    if (!record.value) return;
    const unit = record.value.water.intake.unit;
    const addMl = unit === "l" ? amount * 1000 : amount;
    try {
        await updateWater(dateParam, { addMl });
        await fetchRecord();
    } catch (e) {
        notify(getErrorMessage(e), "error");
    }
}

async function handleResetWater() {
    try {
        await updateWater(dateParam, { intake: 0 });
        await fetchRecord();
    } catch (e) {
        notify(getErrorMessage(e), "error");
    }
}

async function saveNotes() {
    if (!record.value?._id || noteEdits.value === record.value.notes) return;
    try {
        await updateDailyMeta(record.value._id, { notes: noteEdits.value });
        notify("Observações salvas");
    } catch (e) {
        notify(getErrorMessage(e), "error");
    }
}

function confirmDeleteDay() {
    confirmDialog.value = {
        show: true,
        title: "Excluir registro do dia?",
        message: "Esta ação não pode ser desfeita. Todos os dados deste dia serão excluídos.",
        onConfirm: async () => {
            confirmDialog.value.show = false;
            if (!record.value?._id) return;
            try {
                await deleteDailyRecord(record.value._id);
                notify("Dia excluído");
                navigateTo("/");
            } catch (e) {
                notify(getErrorMessage(e), "error");
            }
        },
    };
}

function openWorkoutForm() {
    showWorkoutForm.value = true;
}

async function handleSubmitWorkout(workout: WorkoutSession) {
    const wasEditing = !!record.value?.workout;
    try {
        await updateWorkout(dateParam, workout);
        notify(wasEditing ? "Treino atualizado" : "Treino adicionado");
        showWorkoutForm.value = false;
        await fetchRecord();
    } catch (e) {
        notify(getErrorMessage(e), "error");
    }
}

async function handleClearWorkout() {
    try {
        await updateWorkout(dateParam, null);
        notify("Treino removido");
        showWorkoutForm.value = false;
        await fetchRecord();
    } catch (e) {
        notify(getErrorMessage(e), "error");
    }
}

function goToFullEntry() {
    navigateTo(`/daily/new?date=${dateParam}`);
}

function getErrorMessage(e: unknown): string {
    const err = e as { data?: { message?: string }; message?: string };
    return err?.data?.message || err?.message || "Erro inesperado";
}

onMounted(fetchRecord);
</script>

<style scoped>
.daily-detail {
    width: 100%;
}
.summary-card {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
.summary-icon {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.summary-desc {
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.exercise-row {
    transition: background 0.15s ease;
}
.exercise-row:hover {
    background: rgba(255, 255, 255, 0.04);
}
.fade-list-enter-active,
.fade-list-leave-active {
    transition: all 0.3s ease;
}
.fade-list-enter-from {
    opacity: 0;
    transform: translateY(-8px);
}
.fade-list-leave-to {
    opacity: 0;
    transform: translateX(8px);
}
</style>
