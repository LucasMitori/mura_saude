<template>
    <v-autocomplete
        v-model="selected"
        v-model:search="term"
        :items="results"
        :loading="loading"
        item-title="name"
        item-value="id"
        return-object
        no-filter
        hide-no-data
        hide-details
        clearable
        autocomplete="off"
        :density="density ?? 'comfortable'"
        variant="outlined"
        prepend-inner-icon="mdi-magnify"
        :label="label ?? 'Buscar exercício (wger)'"
        placeholder="Ex: supino, agachamento, corrida..."
        :menu-props="{ maxHeight: 360 }"
        @update:model-value="onSelect"
    >
        <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" lines="two">
                <template #prepend>
                    <v-avatar size="40" rounded="lg" color="surface-bright">
                        <v-img v-if="item.raw?.imageUrl" :src="item.raw.imageUrl" cover />
                        <v-icon v-else size="20" color="red">mdi-dumbbell</v-icon>
                    </v-avatar>
                </template>
                <v-list-item-subtitle v-if="item.raw">
                    <span v-if="item.raw.category">{{ item.raw.category }}</span>
                    <span v-if="item.raw.muscles"> · {{ item.raw.muscles }}</span>
                </v-list-item-subtitle>
            </v-list-item>
        </template>

        <template #no-data>
            <div class="pa-3 text-caption text-grey text-center">
                <template v-if="term && term.trim().length >= 2 && !loading">
                    Nenhum exercício encontrado. Você pode adicionar manualmente.
                </template>
                <template v-else>
                    Digite ao menos 2 letras para buscar.
                </template>
            </div>
        </template>
    </v-autocomplete>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { ExerciseSuggestion } from "#shared/types/workout-routine";

defineProps<{
    label?: string;
    density?: "default" | "comfortable" | "compact";
}>();

const emit = defineEmits<{ select: [ex: ExerciseSuggestion] }>();

const { searchExercises } = useExercises();

const term = ref("");
const results = ref<ExerciseSuggestion[]>([]);
const loading = ref(false);
const selected = ref<ExerciseSuggestion | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
let reqId = 0;

watch(term, (val) => {
    if (timer) clearTimeout(timer);
    const q = (val || "").trim();
    if (q.length < 2) {
        results.value = [];
        loading.value = false;
        return;
    }
    const myReq = ++reqId;
    timer = setTimeout(async () => {
        loading.value = true;
        try {
            const ex = await searchExercises(q);
            if (myReq !== reqId) return;
            // Guarantee unique non-empty ids for the virtual scroll.
            const seen = new Set<string>();
            results.value = ex
                .filter((e) => e && e.name)
                .map((e, i) => {
                    let id = String(e.id ?? "");
                    if (!id || seen.has(id)) id = `ex-${i}`;
                    seen.add(id);
                    return { ...e, id };
                });
        } catch {
            if (myReq === reqId) results.value = [];
        } finally {
            if (myReq === reqId) loading.value = false;
        }
    }, 350);
});

function onSelect(ex: ExerciseSuggestion | null) {
    if (!ex) return;
    emit("select", ex);
    selected.value = null;
    term.value = "";
    results.value = [];
}
</script>
