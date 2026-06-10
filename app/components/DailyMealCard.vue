<template>
    <v-card
        variant="outlined"
        class="meal-card"
        :style="{ borderLeftColor: borderColor }"
    >
        <v-card-title class="d-flex align-center pa-3">
            <v-chip :color="mealColor" size="small" class="mr-2" variant="tonal">
                <v-icon start size="14">{{ mealIcon }}</v-icon>
                {{ mealLabel }}
            </v-chip>
            <span class="text-body-1 font-weight-medium">
                {{ meal.label || "Sem nome" }}
            </span>
            <v-spacer />
            <v-chip
                v-if="meal.time"
                size="x-small"
                variant="outlined"
                class="mr-1"
            >
                <v-icon start size="12">mdi-clock-outline</v-icon>
                {{ meal.time }}
            </v-chip>
            <v-chip size="x-small" color="warning" class="mr-1">
                {{ meal.totalCalories }} kcal
            </v-chip>
            <v-chip size="x-small" color="info" class="mr-2">
                {{ meal.totalWeight }}g
            </v-chip>
            <template v-if="editable">
                <v-btn
                    icon="mdi-pencil"
                    size="x-small"
                    variant="text"
                    @click="$emit('edit', meal)"
                />
                <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    color="error"
                    variant="text"
                    @click="$emit('delete', meal)"
                />
            </template>
        </v-card-title>

        <v-card-text v-if="meal.foods.length > 0" class="pa-0">
            <v-table density="compact" hover>
                <thead>
                    <tr>
                        <th>Alimento</th>
                        <th class="text-right">Peso</th>
                        <th class="text-right">Kcal</th>
                        <v-tooltip
                            v-for="col in macroColumns"
                            :key="col.short"
                            :text="col.label"
                            location="top"
                        >
                            <template #activator="{ props: tip }">
                                <th class="text-right macro-th" v-bind="tip">
                                    {{ col.short }}
                                </th>
                            </template>
                        </v-tooltip>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(food, i) in meal.foods" :key="i">
                        <td>{{ food.name || "-" }}</td>
                        <td class="text-right">{{ food.weightGrams }}g</td>
                        <td class="text-right">{{ food.calories }}</td>
                        <td class="text-right">{{ food.protein ?? "-" }}</td>
                        <td class="text-right">{{ food.carbs ?? "-" }}</td>
                        <td class="text-right">{{ food.fats ?? "-" }}</td>
                        <td class="text-right">{{ food.fiber ?? "-" }}</td>
                    </tr>
                </tbody>
            </v-table>
        </v-card-text>

        <v-card-text v-if="meal.notes" class="pt-1 pb-3">
            <v-icon size="14" class="mr-1">mdi-note-text-outline</v-icon>
            <span class="text-caption text-grey">{{ meal.notes }}</span>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Meal, MealType } from "#shared/types/daily";
import { MEAL_TYPE_LABELS } from "#shared/types/daily";

const props = defineProps<{
    meal: Meal;
    editable?: boolean;
}>();

defineEmits<{
    edit: [meal: Meal];
    delete: [meal: Meal];
}>();

// Macro column headers with full names shown on hover.
const macroColumns = [
    { short: "P", label: "Proteína (g)" },
    { short: "C", label: "Carboidratos (g)" },
    { short: "G", label: "Gorduras (g)" },
    { short: "F", label: "Fibra (g)" },
];

const colorMap: Record<MealType, string> = {
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

const iconMap: Record<MealType, string> = {
    pre_workout: "mdi-run-fast",
    breakfast: "mdi-coffee",
    morning_snack: "mdi-food-apple",
    lunch: "mdi-food-fork-drink",
    afternoon_snack: "mdi-cookie",
    pre_workout_meal: "mdi-dumbbell",
    post_workout: "mdi-arm-flex",
    dinner: "mdi-food-turkey",
    supper: "mdi-cup",
    snack: "mdi-food",
};

const borderColorMap: Record<MealType, string> = {
    pre_workout: "#7E57C2",
    breakfast: "#FFA726",
    morning_snack: "#FFC107",
    lunch: "#66BB6A",
    afternoon_snack: "#26A69A",
    pre_workout_meal: "#5E35B1",
    post_workout: "#5C6BC0",
    dinner: "#42A5F5",
    supper: "#78909C",
    snack: "#90A4AE",
};

const mealColor = computed(() => colorMap[props.meal.type] || "grey");
const mealIcon = computed(() => iconMap[props.meal.type] || "mdi-food");
const mealLabel = computed(() => MEAL_TYPE_LABELS[props.meal.type] || props.meal.type);
const borderColor = computed(() => borderColorMap[props.meal.type] || "#666");
</script>

<style scoped>
.meal-card {
    border-left: 4px solid;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.meal-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}
/* Hint that the abbreviated macro headers reveal a tooltip on hover. */
.macro-th {
    cursor: help;
    text-decoration: underline dotted;
    text-underline-offset: 3px;
}
</style>
