<template>
    <div class="treinos-page">
        <div class="d-flex align-center mb-4 flex-wrap ga-2">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold gradient-text d-flex align-center">
                    <v-icon size="30" color="primary" class="mr-2">mdi-clipboard-list</v-icon>
                    Treinos
                </h1>
                <p class="text-body-2 text-grey">
                    Monte rotinas (Treino A, B, C…) e aplique-as a qualquer dia
                </p>
            </div>
            <v-spacer />
            <v-btn
                v-if="authStore.can('treinos.create')"
                color="primary"
                size="large"
                prepend-icon="mdi-plus"
                @click="openForm(null)"
            >
                Nova Rotina
            </v-btn>
        </div>

        <div v-if="loading" class="text-center py-10">
            <v-progress-circular indeterminate color="primary" size="56" />
        </div>

        <v-card v-else-if="routines.length === 0" variant="tonal" class="text-center pa-10">
            <v-icon size="56" color="primary" class="mb-3">mdi-dumbbell</v-icon>
            <p class="text-h6 mb-1">Nenhuma rotina criada ainda</p>
            <p class="text-body-2 text-medium-emphasis mb-4">
                Crie sua primeira rotina de treino para reutilizar quando quiser.
            </p>
            <v-btn v-if="authStore.can('treinos.create')" color="primary" prepend-icon="mdi-plus" @click="openForm(null)">
                Criar Rotina
            </v-btn>
        </v-card>

        <template v-else>
            <v-tabs v-model="tab" color="primary" class="mb-3">
                <v-tab value="active">
                    <v-icon start>mdi-dumbbell</v-icon>
                    Ativas ({{ activeRoutines.length }})
                </v-tab>
                <v-tab value="archived">
                    <v-icon start>mdi-archive-outline</v-icon>
                    Arquivadas ({{ archivedRoutines.length }})
                </v-tab>
            </v-tabs>

            <div
                v-if="visibleRoutines.length === 0"
                class="text-center text-medium-emphasis py-10"
            >
                <v-icon size="48" class="mb-2">
                    {{ tab === "archived" ? "mdi-archive-outline" : "mdi-dumbbell" }}
                </v-icon>
                <p>
                    {{ tab === "archived" ? "Nenhuma rotina arquivada." : "Nenhuma rotina ativa." }}
                </p>
            </div>

            <v-row v-else>
                <v-col v-for="r in visibleRoutines" :key="r._id" cols="12" md="6" lg="4">
                    <v-card
                        class="routine-card h-100 d-flex flex-column"
                        :class="{ 'routine-archived': r.archived }"
                    >
                        <v-card-title class="d-flex align-center pa-4">
                            <v-avatar v-if="r.series" color="primary" variant="flat" size="36" class="mr-2 font-weight-bold">
                                {{ r.series }}
                            </v-avatar>
                            <span class="text-truncate">{{ r.name }}</span>
                            <v-spacer />
                            <v-chip v-if="r.archived" size="x-small" color="grey" variant="tonal">
                                <v-icon start size="12">mdi-archive</v-icon>
                                Arquivada
                            </v-chip>
                        </v-card-title>
                        <v-divider />
                        <v-card-text class="flex-grow-1">
                        <p v-if="r.description" class="text-body-2 text-medium-emphasis mb-3">
                            {{ r.description }}
                        </p>
                        <div class="d-flex flex-wrap ga-2 mb-3">
                            <v-chip size="small" color="info" variant="tonal">
                                <v-icon start size="14">mdi-format-list-numbered</v-icon>
                                {{ r.exercises.length }} exercícios
                            </v-chip>
                            <v-chip size="small" color="red" variant="tonal">
                                <v-icon start size="14">mdi-timer-outline</v-icon>
                                {{ r.estimatedDurationMinutes }} min
                            </v-chip>
                            <v-chip size="small" color="orange" variant="tonal">
                                <v-icon start size="14">mdi-fire</v-icon>
                                {{ r.estimatedCaloriesBurned }} kcal
                            </v-chip>
                        </div>
                        <v-expansion-panels v-if="r.exercises.length" variant="accordion" class="routine-ex">
                            <v-expansion-panel>
                                <v-expansion-panel-title class="text-body-2">
                                    Ver exercícios
                                </v-expansion-panel-title>
                                <v-expansion-panel-text>
                                    <div
                                        v-for="(ex, i) in r.exercises"
                                        :key="i"
                                        class="d-flex align-center py-1"
                                    >
                                        <v-icon size="16" color="red" class="mr-2">mdi-circle-small</v-icon>
                                        <span class="text-body-2">{{ ex.name }}</span>
                                        <v-spacer />
                                        <span class="text-caption text-medium-emphasis">
                                            <template v-if="ex.sets && ex.reps">{{ ex.sets }}×{{ ex.reps }}</template>
                                            <template v-if="ex.weightKg"> · {{ ex.weightKg }}kg</template>
                                        </span>
                                    </div>
                                </v-expansion-panel-text>
                            </v-expansion-panel>
                        </v-expansion-panels>
                        </v-card-text>
                        <v-divider v-if="canManage" />
                        <v-card-actions v-if="canManage" class="px-4">
                            <v-btn
                                v-if="authStore.can('treinos.edit') && !r.archived"
                                variant="text"
                                size="small"
                                prepend-icon="mdi-pencil"
                                @click="openForm(r)"
                            >
                                Editar
                            </v-btn>
                            <v-btn
                                v-if="authStore.can('treinos.archive') && !r.archived"
                                variant="text"
                                size="small"
                                prepend-icon="mdi-archive-arrow-down-outline"
                                @click="toggleArchive(r, true)"
                            >
                                Arquivar
                            </v-btn>
                            <v-btn
                                v-if="authStore.can('treinos.archive') && r.archived"
                                variant="text"
                                size="small"
                                color="primary"
                                prepend-icon="mdi-archive-arrow-up-outline"
                                @click="toggleArchive(r, false)"
                            >
                                Restaurar
                            </v-btn>
                            <v-spacer />
                            <v-btn
                                v-if="authStore.can('treinos.delete')"
                                variant="text"
                                size="small"
                                color="error"
                                icon="mdi-delete"
                                @click="confirmDelete(r)"
                            />
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <!-- Routine form dialog -->
        <v-dialog v-model="showForm" max-width="900" scrollable>
            <v-card>
                <v-card-title class="d-flex align-center pa-4">
                    <v-icon start color="primary">mdi-clipboard-edit-outline</v-icon>
                    {{ editing._id ? "Editar Rotina" : "Nova Rotina" }}
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4">
                    <v-row density="comfortable" class="mb-1">
                        <v-col cols="12" sm="8">
                            <v-text-field
                                v-model="editing.name"
                                label="Nome da rotina"
                                placeholder="Ex: Treino A — Peito e Tríceps"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                            />
                        </v-col>
                        <v-col cols="12" sm="4">
                            <v-text-field
                                v-model="editing.series"
                                label="Série"
                                placeholder="A, B, C…"
                                maxlength="3"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                            />
                        </v-col>
                    </v-row>
                    <v-textarea
                        v-model="editing.description"
                        label="Descrição (opcional)"
                        rows="2"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                        class="mb-3"
                    />
                    <ExerciseListEditor v-model="editing.exercises" />
                </v-card-text>
                <v-divider />
                <v-card-actions class="pa-4">
                    <v-spacer />
                    <v-btn variant="text" @click="showForm = false">Cancelar</v-btn>
                    <v-btn
                        color="primary"
                        variant="elevated"
                        prepend-icon="mdi-content-save"
                        :loading="saving"
                        :disabled="!editing.name.trim()"
                        @click="save"
                    >
                        Salvar Rotina
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Confirm delete -->
        <v-dialog v-model="deleteDialog.show" max-width="420">
            <v-card>
                <v-card-title>Excluir rotina?</v-card-title>
                <v-card-text>
                    Tem certeza que deseja excluir "{{ deleteDialog.name }}"?
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="deleteDialog.show = false">Cancelar</v-btn>
                    <v-btn color="error" variant="elevated" @click="doDelete">Excluir</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { WorkoutRoutine } from "#shared/types/workout-routine";
import type { Exercise } from "#shared/types/daily";
import { useAuthStore } from "~/stores/auth.store";

definePageMeta({ requiresPermission: "treinos.view" });

const authStore = useAuthStore();
const { listRoutines, createRoutine, updateRoutine, deleteRoutine, archiveRoutine } = useRoutines();
const { success, error: notifyError } = useSnackbar();

const routines = ref<WorkoutRoutine[]>([]);
const loading = ref(true);
const saving = ref(false);
const showForm = ref(false);
const tab = ref<"active" | "archived">("active");

const activeRoutines = computed(() => routines.value.filter((r) => !r.archived));
const archivedRoutines = computed(() => routines.value.filter((r) => r.archived));
const visibleRoutines = computed(() =>
    tab.value === "archived" ? archivedRoutines.value : activeRoutines.value,
);
// Whether the current user can manage routines at all (controls the action row).
const canManage = computed(
    () =>
        authStore.can("treinos.edit") ||
        authStore.can("treinos.archive") ||
        authStore.can("treinos.delete"),
);

interface EditingRoutine {
    _id?: string;
    name: string;
    series: string;
    description: string;
    exercises: Exercise[];
}

const editing = ref<EditingRoutine>({ name: "", series: "", description: "", exercises: [] });

const deleteDialog = ref<{ show: boolean; id: string | null; name: string }>({
    show: false,
    id: null,
    name: "",
});

async function load() {
    loading.value = true;
    try {
        routines.value = await listRoutines();
    } catch {
        routines.value = [];
    } finally {
        loading.value = false;
    }
}

function openForm(r: WorkoutRoutine | null) {
    if (r) {
        editing.value = {
            _id: r._id,
            name: r.name,
            series: r.series || "",
            description: r.description || "",
            exercises: JSON.parse(JSON.stringify(r.exercises || [])),
        };
    } else {
        editing.value = { name: "", series: "", description: "", exercises: [] };
    }
    showForm.value = true;
}

async function save() {
    if (!editing.value.name.trim()) return;
    saving.value = true;
    try {
        const payload = {
            name: editing.value.name.trim(),
            series: editing.value.series.trim(),
            description: editing.value.description.trim(),
            exercises: editing.value.exercises,
        };
        if (editing.value._id) {
            await updateRoutine(editing.value._id, payload);
            success("Rotina atualizada");
        } else {
            await createRoutine(payload);
            success("Rotina criada");
        }
        showForm.value = false;
        await load();
    } catch (e) {
        notifyError(getErr(e));
    } finally {
        saving.value = false;
    }
}

function confirmDelete(r: WorkoutRoutine) {
    deleteDialog.value = { show: true, id: r._id || null, name: r.name };
}

async function doDelete() {
    const id = deleteDialog.value.id;
    deleteDialog.value.show = false;
    if (!id) return;
    try {
        await deleteRoutine(id);
        success("Rotina excluída");
        await load();
    } catch (e) {
        notifyError(getErr(e));
    }
}

async function toggleArchive(r: WorkoutRoutine, archived: boolean) {
    if (!r._id) return;
    try {
        await archiveRoutine(r._id, archived);
        success(archived ? "Rotina arquivada" : "Rotina restaurada");
        await load();
    } catch (e) {
        notifyError(getErr(e));
    }
}

function getErr(e: unknown): string {
    const err = e as { data?: { message?: string }; message?: string };
    return err?.data?.message || err?.message || "Erro inesperado";
}

onMounted(load);
</script>

<style scoped>
.treinos-page {
    width: 100%;
}
.gradient-text {
    background: linear-gradient(135deg, #4caf50, #03dac6);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.routine-card {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.routine-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}
.routine-archived {
    opacity: 0.72;
}
.routine-ex :deep(.v-expansion-panel) {
    background: transparent;
}
</style>
