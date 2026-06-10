<template>
    <v-autocomplete
        v-model="selected"
        v-model:search="term"
        :items="results"
        :loading="loading"
        item-title="name"
        item-value="code"
        return-object
        no-filter
        hide-no-data
        hide-details
        clearable
        autocomplete="off"
        :density="density ?? 'comfortable'"
        variant="outlined"
        prepend-inner-icon="mdi-database-search"
        :label="label ?? 'Buscar alimento (Open Food Facts)'"
        placeholder="Ex: arroz, frango, iogurte..."
        :menu-props="{ maxHeight: 420 }"
        @update:model-value="onSelect"
    >
        <!-- `v-bind="itemProps"` already supplies the title from item-title="name".
             Never read item.raw directly without a guard — Vuetify can hand this
             slot a transient item whose `raw` is undefined. -->
        <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" lines="two">
                <template #prepend>
                    <v-avatar size="40" rounded="lg" color="surface-bright">
                        <v-img
                            v-if="item.raw?.imageUrl"
                            :src="item.raw.imageUrl"
                            cover
                        />
                        <v-icon v-else size="20" color="primary">
                            mdi-food-apple
                        </v-icon>
                    </v-avatar>
                </template>
                <v-list-item-subtitle v-if="item.raw?.per100g" class="food-meta">
                    <span v-if="item.raw.brand" class="font-weight-medium">
                        {{ item.raw.brand }} ·
                    </span>
                    <span class="text-warning">{{ item.raw.per100g.calories }} kcal</span>
                    · P {{ item.raw.per100g.protein }}g
                    · C {{ item.raw.per100g.carbs }}g
                    · G {{ item.raw.per100g.fats }}g
                    <span class="text-grey"> / 100g</span>
                </v-list-item-subtitle>
            </v-list-item>
        </template>

        <!-- Infinite scroll: when this sentinel scrolls into view, load the next
             page from Open Food Facts and append it. -->
        <template #append-item>
            <div
                v-if="hasMore"
                v-intersect="onIntersect"
                class="pa-3 d-flex align-center justify-center text-caption text-grey"
            >
                <v-progress-circular
                    v-if="loadingMore"
                    indeterminate
                    size="18"
                    width="2"
                    color="primary"
                    class="mr-2"
                />
                {{ loadingMore ? "Carregando mais…" : "Role para carregar mais" }}
            </div>
        </template>

        <template #no-data>
            <div class="pa-3 text-caption text-grey text-center">
                <template v-if="term && term.trim().length >= 2 && !loading">
                    Nenhum alimento encontrado. Você pode adicionar manualmente.
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
import type { NutritionFood } from "#shared/types/nutrition";

defineProps<{
    label?: string;
    density?: "default" | "comfortable" | "compact";
}>();

const emit = defineEmits<{ select: [food: NutritionFood] }>();

const { searchFoods } = useNutrition();

const term = ref("");
const results = ref<NutritionFood[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const page = ref(1);
const selected = ref<NutritionFood | null>(null);

let timer: ReturnType<typeof setTimeout> | null = null;
let reqId = 0;
let seen = new Set<string>();

// Keep only usable items and guarantee a unique, non-empty `code`. OFF often
// returns products with missing/duplicate codes, which collide under
// `item-value="code"` and crash Vuetify's virtual scroll. `seen` persists
// across pages of one search so appended pages stay unique too.
function normalizeFoods(foods: NutritionFood[]): NutritionFood[] {
    const out: NutritionFood[] = [];
    foods.forEach((f, i) => {
        if (!f || !f.name || !f.per100g) return;
        let code = f.code || `food-${seen.size}-${i}`;
        if (seen.has(code)) code = `${code}-${seen.size}-${i}`;
        seen.add(code);
        out.push({ ...f, code });
    });
    return out;
}

watch(term, (val) => {
    if (timer) clearTimeout(timer);
    const q = (val || "").trim();
    if (q.length < 2) {
        results.value = [];
        hasMore.value = false;
        loading.value = false;
        return;
    }
    const myReq = ++reqId;
    timer = setTimeout(async () => {
        loading.value = true;
        page.value = 1;
        seen = new Set<string>();
        try {
            const res = await searchFoods(q, 1);
            if (myReq !== reqId) return; // ignore out-of-order responses
            results.value = normalizeFoods(res.foods);
            hasMore.value = res.hasMore;
        } catch {
            if (myReq === reqId) {
                results.value = [];
                hasMore.value = false;
            }
        } finally {
            if (myReq === reqId) loading.value = false;
        }
    }, 350);
});

async function loadMore() {
    const q = term.value.trim();
    if (loadingMore.value || !hasMore.value || q.length < 2) return;
    loadingMore.value = true;
    const nextPage = page.value + 1;
    try {
        const res = await searchFoods(q, nextPage);
        const appended = normalizeFoods(res.foods);
        if (appended.length) results.value = [...results.value, ...appended];
        page.value = nextPage;
        // Stop if the API has no more pages, or this page yielded nothing usable
        // (guards against looping through empty pages).
        hasMore.value = res.hasMore && appended.length > 0;
    } catch {
        hasMore.value = false;
    } finally {
        loadingMore.value = false;
    }
}

// Vuetify's v-intersect handler signature has varied across versions
// ((isIntersecting, entries, observer) vs (entries, observer, isIntersecting));
// detect the boolean defensively.
function onIntersect(...args: unknown[]) {
    const isIntersecting = args.some(
        (a) =>
            a === true ||
            (Array.isArray(a) &&
                (a as IntersectionObserverEntry[]).some((e) => e?.isIntersecting)),
    );
    if (isIntersecting) loadMore();
}

function onSelect(food: NutritionFood | null) {
    if (!food) return;
    emit("select", food);
    // Reset so the field is ready for the next search instead of holding the pick.
    selected.value = null;
    term.value = "";
    results.value = [];
    hasMore.value = false;
}
</script>

<style scoped>
.food-meta {
    opacity: 0.9;
}
</style>
