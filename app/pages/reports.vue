<template>
    <div class="reports-page">
        <div class="d-flex align-center mb-3 flex-wrap ga-2">
            <h1 class="text-h5 text-md-h4 font-weight-bold gradient-text d-flex align-center">
                <v-icon size="28" color="primary" class="mr-2">mdi-chart-box</v-icon>
                Relatórios
            </h1>
            <v-spacer />
            <v-btn-toggle
                v-model="exportType"
                color="primary"
                density="comfortable"
                variant="outlined"
            >
                <v-btn value="csv" prepend-icon="mdi-file-delimited">CSV</v-btn>
                <v-btn value="json" prepend-icon="mdi-code-braces">JSON</v-btn>
            </v-btn-toggle>
            <v-btn
                color="success"
                prepend-icon="mdi-download"
                class="text-white"
                @click="exportData"
            >
                Exportar
            </v-btn>
        </div>

        <!-- Filters -->
        <v-card class="mb-3">
            <v-card-text>
                <v-row density="comfortable" align="center">
                    <v-col cols="12" md="3">
                        <AppDateField
                            v-model="filters.from"
                            label="De"
                            density="comfortable"
                            variant="outlined"
                            prepend-inner-icon="mdi-calendar-start"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="12" md="3">
                        <AppDateField
                            v-model="filters.to"
                            label="Até"
                            density="comfortable"
                            variant="outlined"
                            prepend-inner-icon="mdi-calendar-end"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="12" md="3">
                        <v-select
                            v-model="filters.mealType"
                            :items="mealTypeOptions"
                            item-title="label"
                            item-value="value"
                            label="Tipo de refeição"
                            clearable
                            density="comfortable"
                            prepend-inner-icon="mdi-filter"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="12" md="3">
                        <v-text-field
                            v-model="filters.search"
                            label="Buscar alimento..."
                            density="comfortable"
                            prepend-inner-icon="mdi-magnify"
                            clearable
                            hide-details
                        />
                    </v-col>
                </v-row>

                <v-row class="mt-1">
                    <v-col cols="12">
                        <v-btn-toggle
                            v-model="quickRange"
                            color="primary"
                            density="comfortable"
                            mandatory
                            @update:model-value="applyQuickRange"
                        >
                            <v-btn value="7">7d</v-btn>
                            <v-btn value="14">14d</v-btn>
                            <v-btn value="30">30d</v-btn>
                            <v-btn value="60">60d</v-btn>
                            <v-btn value="90">90d</v-btn>
                            <v-btn value="365">1ano</v-btn>
                        </v-btn-toggle>
                        <v-btn
                            class="ml-2"
                            variant="outlined"
                            color="primary"
                            prepend-icon="mdi-refresh"
                            :loading="loading"
                            @click="loadData"
                        >
                            Atualizar
                        </v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- KPIs -->
        <v-row class="mb-3" density="comfortable">
            <v-col cols="6" sm="3">
                <v-card variant="tonal" color="primary" class="kpi-card h-100">
                    <v-card-text class="d-flex align-center pa-3">
                        <v-icon size="32" class="mr-3 opacity-80">mdi-calendar-check</v-icon>
                        <div class="flex-grow-1">
                            <p class="text-caption mb-0">Dias registrados</p>
                            <p class="text-h5 font-weight-bold">{{ kpis.totalDays }}</p>
                            <p class="text-caption mb-0 opacity-70">
                                de {{ kpis.daysInRange }}
                            </p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="6" sm="3">
                <v-card variant="tonal" color="warning" class="kpi-card h-100">
                    <v-card-text class="d-flex align-center pa-3">
                        <v-icon size="32" class="mr-3 opacity-80">mdi-fire</v-icon>
                        <div class="flex-grow-1">
                            <p class="text-caption mb-0">Média/dia</p>
                            <p class="text-h5 font-weight-bold">
                                {{ kpis.avgCalories }}
                            </p>
                            <p class="text-caption mb-0 opacity-70">kcal</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="6" sm="3">
                <v-card variant="tonal" color="success" class="kpi-card h-100">
                    <v-card-text class="d-flex align-center pa-3">
                        <v-icon size="32" class="mr-3 opacity-80">mdi-trending-down</v-icon>
                        <div class="flex-grow-1">
                            <p class="text-caption mb-0">Em déficit</p>
                            <p class="text-h5 font-weight-bold">
                                {{ kpis.deficitDays }}
                            </p>
                            <p class="text-caption mb-0 opacity-70">
                                {{ kpis.deficitRate }}% do período
                            </p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="6" sm="3">
                <v-card variant="tonal" color="info" class="kpi-card h-100">
                    <v-card-text class="d-flex align-center pa-3">
                        <v-icon size="32" class="mr-3 opacity-80">mdi-dumbbell</v-icon>
                        <div class="flex-grow-1">
                            <p class="text-caption mb-0">Treinos</p>
                            <p class="text-h5 font-weight-bold">{{ kpis.workouts }}</p>
                            <p class="text-caption mb-0 opacity-70">
                                {{ kpis.totalBurned }} kcal
                            </p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" md="8">
                <!-- Calorie Chart -->
                <v-card class="mb-3">
                    <v-card-title>
                        <v-icon start>mdi-chart-bar</v-icon>
                        Calorias por dia
                    </v-card-title>
                    <v-card-text>
                        <Bar
                            v-if="calorieChartData.labels.length > 0"
                            :data="calorieChartData as any"
                            :options="barChartOptions"
                            style="max-height: 240px"
                        />
                        <p v-else class="text-grey text-center py-8">
                            Sem dados para o período selecionado.
                        </p>
                    </v-card-text>
                </v-card>

                <!-- Macros Stacked -->
                <v-card class="mb-3">
                    <v-card-title>
                        <v-icon start>mdi-chart-areaspline</v-icon>
                        Evolução de Macros (g)
                    </v-card-title>
                    <v-card-text>
                        <Line
                            v-if="macroChartData.labels.length > 0"
                            :data="macroChartData"
                            :options="lineChartOptions"
                            style="max-height: 240px"
                        />
                        <p v-else class="text-grey text-center py-8">
                            Sem dados de macros.
                        </p>
                    </v-card-text>
                </v-card>

                <!-- Weight -->
                <v-card class="mb-3">
                    <v-card-title>
                        <v-icon start>mdi-chart-line</v-icon>
                        Evolução de peso
                    </v-card-title>
                    <v-card-text>
                        <Line
                            v-if="weightChartData.labels.length > 0"
                            :data="weightChartData"
                            :options="lineChartOptions"
                            style="max-height: 240px"
                        />
                        <p v-else class="text-grey text-center py-8">
                            Sem dados de peso para o período.
                        </p>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="4">
                <v-card class="mb-3">
                    <v-card-title>
                        <v-icon start>mdi-chart-donut</v-icon>
                        Distribuição por Tipo de Refeição
                    </v-card-title>
                    <v-card-text>
                        <Doughnut
                            v-if="mealTypeChartData.labels.length > 0"
                            :data="mealTypeChartData"
                            :options="doughnutOptions"
                            style="max-height: 200px"
                        />
                        <p v-else class="text-grey text-center py-8">
                            Sem refeições.
                        </p>
                    </v-card-text>
                </v-card>

                <v-card>
                    <v-card-title>
                        <v-icon start>mdi-trophy</v-icon>
                        Top 10 alimentos
                    </v-card-title>
                    <v-divider />
                    <v-card-text class="top-foods-list pa-2">
                        <v-list density="compact">
                            <v-list-item
                                v-for="(item, i) in topFoods"
                                :key="item.name"
                                :title="item.name"
                                :subtitle="`${item.totalCalories} kcal · ${item.count}x`"
                            >
                                <template #prepend>
                                    <v-avatar :color="rankColor(i)" size="28">
                                        <span class="text-caption font-weight-bold">{{ i + 1 }}</span>
                                    </v-avatar>
                                </template>
                            </v-list-item>
                            <v-list-item v-if="topFoods.length === 0">
                                <v-list-item-title class="text-grey">
                                    Nenhum alimento registrado
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Meal Search Results Table -->
        <v-card class="mb-3">
            <v-card-title class="d-flex align-center pa-4">
                <v-icon start>mdi-magnify</v-icon>
                Resultados ({{ filteredMeals.length }} refeições)
            </v-card-title>
            <v-divider />
            <v-data-table
                :items="filteredMeals"
                :headers="tableHeaders"
                :items-per-page="20"
                density="comfortable"
                class="search-table"
            >
                <template #item.date="{ item }">
                    <NuxtLink :to="`/daily/${item.date}`">
                        {{ formatDate(item.date) }}
                    </NuxtLink>
                </template>
                <template #item.type="{ item }">
                    <v-chip size="small" :color="mealColor(item.type)">
                        {{ mealLabel(item.type) }}
                    </v-chip>
                </template>
                <template #item.foods="{ item }">
                    {{ item.foodsList }}
                </template>
            </v-data-table>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, Line, Doughnut } from "vue-chartjs";
// Chart.js components are registered once globally in app/plugins/chartjs.client.ts
import type { DailyRecord, MealType, Meal } from "#shared/types/daily";
import { MEAL_TYPE_LABELS } from "#shared/types/daily";

const { getDailyRecords } = useDaily();

const loading = ref(false);
const records = ref<DailyRecord[]>([]);
const exportType = ref<"csv" | "json">("csv");
const quickRange = ref("30");

const filters = ref({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
    mealType: null as MealType | null,
    search: "",
});

const mealTypeOptions = (Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((v) => ({
    label: MEAL_TYPE_LABELS[v],
    value: v,
}));

async function loadData() {
    loading.value = true;
    try {
        records.value = await getDailyRecords(filters.value.from, filters.value.to, 365);
    } catch {
        records.value = [];
    } finally {
        loading.value = false;
    }
}

function applyQuickRange(days: string | undefined) {
    if (!days) return;
    filters.value.from = format(subDays(new Date(), Number(days)), "yyyy-MM-dd");
    filters.value.to = format(new Date(), "yyyy-MM-dd");
    loadData();
}

// ===== KPIs =====
const kpis = computed(() => {
    const recs = records.value;
    const totalDays = recs.length;
    const totalCalories = recs.reduce(
        (s, r) => s + ((r.summary as Record<string, number>)?.totalCaloriesConsumed || 0),
        0,
    );
    const totalBurned = recs.reduce(
        (s, r) => s + ((r.summary as Record<string, number>)?.totalCaloriesBurned || 0),
        0,
    );
    const deficitDays = recs.filter(
        (r) => ((r.summary as Record<string, number>)?.caloricBalance || 0) < 0,
    ).length;
    const workouts = recs.filter(
        (r) => r.workout && (r.workout.exercises || []).length > 0,
    ).length;
    const daysInRange =
        differenceInDays(new Date(filters.value.to), new Date(filters.value.from)) + 1;

    return {
        totalDays,
        totalCalories: Math.round(totalCalories),
        avgCalories: totalDays > 0 ? Math.round(totalCalories / totalDays) : 0,
        deficitDays,
        deficitRate:
            daysInRange > 0
                ? Math.round((deficitDays / daysInRange) * 100)
                : 0,
        workouts,
        totalBurned: Math.round(totalBurned),
        daysInRange,
    };
});

// ===== Chart Datas =====
const sortedRecords = computed(() =>
    [...records.value].sort((a, b) => a.date.localeCompare(b.date)),
);

const calorieChartData = computed(() => ({
    labels: sortedRecords.value.map((r) => format(parseISO(r.date), "dd/MM")),
    datasets: [
        {
            label: "Consumido",
            data: sortedRecords.value.map(
                (r) => (r.summary as Record<string, number>)?.totalCaloriesConsumed || 0,
            ),
            backgroundColor: "rgba(255, 167, 38, 0.85)",
        },
        {
            label: "Queimado",
            data: sortedRecords.value.map(
                (r) => (r.summary as Record<string, number>)?.totalCaloriesBurned || 0,
            ),
            backgroundColor: "rgba(239, 83, 80, 0.85)",
        },
        {
            label: "Meta",
            data: sortedRecords.value.map((r) => r.caloricGoal || 2000),
            type: "line" as const,
            borderColor: "#26A69A",
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false,
            tension: 0,
        },
    ],
}));

const macroChartData = computed(() => ({
    labels: sortedRecords.value.map((r) => format(parseISO(r.date), "dd/MM")),
    datasets: [
        {
            label: "Proteína (g)",
            data: sortedRecords.value.map(
                (r) => (r.summary as Record<string, number>)?.totalProtein || 0,
            ),
            borderColor: "#EF5350",
            backgroundColor: "rgba(239, 83, 80, 0.15)",
            tension: 0.4,
            fill: false,
        },
        {
            label: "Carbs (g)",
            data: sortedRecords.value.map(
                (r) => (r.summary as Record<string, number>)?.totalCarbs || 0,
            ),
            borderColor: "#FFA726",
            backgroundColor: "rgba(255, 167, 38, 0.15)",
            tension: 0.4,
            fill: false,
        },
        {
            label: "Gorduras (g)",
            data: sortedRecords.value.map(
                (r) => (r.summary as Record<string, number>)?.totalFats || 0,
            ),
            borderColor: "#42A5F5",
            backgroundColor: "rgba(66, 165, 245, 0.15)",
            tension: 0.4,
            fill: false,
        },
    ],
}));

const weightChartData = computed(() => {
    const labels: string[] = [];
    const data: number[] = [];
    for (const r of sortedRecords.value) {
        const ms = r.bodyMeasurements || [];
        if (ms.length > 0) {
            const morning = ms.find((m) => m.time === "morning") || ms[0]!;
            labels.push(format(parseISO(r.date), "dd/MM"));
            data.push(morning.data.weight.value);
        }
    }
    return {
        labels,
        datasets: [
            {
                label: "Peso (kg)",
                data,
                borderColor: "#4CAF50",
                backgroundColor: "rgba(76, 175, 80, 0.15)",
                tension: 0.4,
                fill: true,
            },
        ],
    };
});

const mealTypeChartData = computed(() => {
    const counts: Record<string, number> = {};
    for (const r of records.value) {
        for (const m of r.meals || []) {
            counts[m.type] = (counts[m.type] || 0) + 1;
        }
    }
    const palette = [
        "#7E57C2",
        "#FFA726",
        "#FFC107",
        "#66BB6A",
        "#26A69A",
        "#5E35B1",
        "#5C6BC0",
        "#42A5F5",
        "#78909C",
        "#90A4AE",
    ];
    const labels = Object.keys(counts).map((k) => MEAL_TYPE_LABELS[k as MealType] || k);
    return {
        labels,
        datasets: [
            {
                data: Object.values(counts),
                backgroundColor: palette.slice(0, labels.length),
                borderWidth: 0,
            },
        ],
    };
});

const topFoods = computed(() => {
    const map = new Map<string, { name: string; totalCalories: number; count: number }>();
    for (const r of records.value) {
        for (const m of r.meals || []) {
            for (const f of m.foods || []) {
                const name = (f.name || "").trim();
                if (!name) continue;
                const entry = map.get(name) || { name, totalCalories: 0, count: 0 };
                entry.totalCalories += f.calories || 0;
                entry.count += 1;
                map.set(name, entry);
            }
        }
    }
    return [...map.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((x) => ({ ...x, totalCalories: Math.round(x.totalCalories) }));
});

// ===== Search Table =====
interface MealRow {
    date: string;
    type: MealType;
    label: string;
    time: string;
    calories: number;
    weight: number;
    foodsList: string;
}

const filteredMeals = computed<MealRow[]>(() => {
    const rows: MealRow[] = [];
    const searchLower = (filters.value.search || "").toLowerCase().trim();
    for (const r of records.value) {
        for (const m of r.meals || []) {
            if (filters.value.mealType && m.type !== filters.value.mealType) continue;
            if (searchLower) {
                const inLabel = (m.label || "").toLowerCase().includes(searchLower);
                const inFoods = (m.foods || []).some((f) =>
                    (f.name || "").toLowerCase().includes(searchLower),
                );
                if (!inLabel && !inFoods) continue;
            }
            rows.push({
                date: r.date,
                type: m.type,
                label: m.label,
                time: m.time,
                calories: m.totalCalories,
                weight: m.totalWeight,
                foodsList: (m.foods || []).map((f) => f.name).filter(Boolean).join(", "),
            });
        }
    }
    return rows.sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : a.time.localeCompare(b.time),
    );
});

const tableHeaders = [
    { title: "Data", key: "date", sortable: true },
    { title: "Tipo", key: "type", sortable: true },
    { title: "Nome", key: "label", sortable: true },
    { title: "Horário", key: "time", sortable: true },
    { title: "Calorias", key: "calories", sortable: true },
    { title: "Peso (g)", key: "weight", sortable: true },
    { title: "Alimentos", key: "foods", sortable: false },
];

function mealLabel(type: MealType): string {
    return MEAL_TYPE_LABELS[type] || type;
}

function mealColor(type: MealType): string {
    const c: Record<MealType, string> = {
        pre_workout: "purple",
        breakfast: "orange",
        morning_snack: "amber",
        lunch: "green",
        afternoon_snack: "teal",
        pre_workout_meal: "deep-purple",
        post_workout: "indigo",
        dinner: "blue",
        supper: "blue-grey",
        snack: "grey",
    };
    return c[type] || "grey";
}

function rankColor(i: number): string {
    if (i === 0) return "amber-darken-2";
    if (i === 1) return "blue-grey-lighten-1";
    if (i === 2) return "brown";
    return "grey-darken-2";
}

function formatDate(d: string): string {
    try {
        return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
    } catch {
        return d;
    }
}

// ===== Chart Options =====
const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: "top" as const },
    },
    scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: false },
    },
};
const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" as const } },
    scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
    },
};
const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const } },
    cutout: "55%",
};

// ===== Export =====
function exportData() {
    if (exportType.value === "json") {
        const blob = new Blob([JSON.stringify(records.value, null, 2)], {
            type: "application/json;charset=utf-8;",
        });
        triggerDownload(blob, `mura_saude_report_${filters.value.from}_${filters.value.to}.json`);
        return;
    }

    const headers = [
        "Data",
        "Peso (kg)",
        "Calorias Consumidas",
        "Calorias Queimadas",
        "Balanço",
        "Proteína (g)",
        "Carbos (g)",
        "Gorduras (g)",
        "Fibra (g)",
        "Refeições",
        "Água %",
    ];
    const rows = sortedRecords.value.map((r) => {
        const s = (r.summary as Record<string, number>) || {};
        const morning = (r.bodyMeasurements || []).find((m) => m.time === "morning");
        const w = morning?.data?.weight?.value ?? "";
        return [
            r.date,
            w,
            s.totalCaloriesConsumed || 0,
            s.totalCaloriesBurned || 0,
            s.caloricBalance || 0,
            s.totalProtein || 0,
            s.totalCarbs || 0,
            s.totalFats || 0,
            s.totalFiber || 0,
            (r.meals || []).length,
            s.waterPercentage || 0,
        ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `mura_saude_report_${filters.value.from}_${filters.value.to}.csv`);
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

onMounted(loadData);
</script>

<style scoped>
.reports-page {
    /* width is governed by the shared layout container so every page lines up */
    width: 100%;
}
.gradient-text {
    background: linear-gradient(135deg, #4caf50, #03dac6);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.kpi-card {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.opacity-70 {
    opacity: 0.7;
}
.opacity-80 {
    opacity: 0.8;
}
/* Bound the Top-10 list so the card can't stretch far below the charts beside
   it — it scrolls instead, keeping the row height sane and the results table
   properly spaced below. */
.top-foods-list {
    max-height: 300px;
    overflow-y: auto;
}
.search-table :deep(a) {
    color: var(--v-primary, #4CAF50);
    text-decoration: none;
}
.search-table :deep(a:hover) {
    text-decoration: underline;
}
</style>
