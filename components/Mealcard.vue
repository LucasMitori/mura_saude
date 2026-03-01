<template>
    <v-card variant="outlined">
        <v-card-title class="text-subtitle-1">
            <v-chip :color="mealColor" size="small" class="mr-2">
                {{ meal.type }}
            </v-chip>
            {{ meal.name }}
        </v-card-title>
        <v-card-text>
            <v-table density="compact">
                <thead>
                    <tr>
                        <th>Ingredient</th>
                        <th>Grams</th>
                        <th>Calories</th>
                        <th>Protein</th>
                        <th>Carbs</th>
                        <th>Fats</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(ing, i) in meal.ingredients" :key="i">
                        <td>{{ ing.name }}</td>
                        <td>{{ ing.grams }}g</td>
                        <td>{{ ing.calories }}</td>
                        <td>{{ ing.protein ?? "-" }}g</td>
                        <td>{{ ing.carbs ?? "-" }}g</td>
                        <td>{{ ing.fats ?? "-" }}g</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="font-weight-bold">
                        <td>Total</td>
                        <td>{{ totalGrams }}g</td>
                        <td>{{ totalCalories }}</td>
                        <td>{{ totalProtein }}g</td>
                        <td>{{ totalCarbs }}g</td>
                        <td>{{ totalFats }}g</td>
                    </tr>
                </tfoot>
            </v-table>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Meal } from "../shared/types/daily";

const props = defineProps<{
    meal: Meal;
}>();

const mealColor = computed(() => {
    const colors: Record<string, string> = {
        breakfast: "orange",
        lunch: "green",
        dinner: "blue",
        snack: "purple",
    };
    return colors[props.meal.type] || "grey";
});

const totalGrams = computed(() =>
    props.meal.ingredients.reduce((s, i) => s + i.grams, 0),
);
const totalCalories = computed(() =>
    props.meal.ingredients.reduce((s, i) => s + i.calories, 0),
);
const totalProtein = computed(() =>
    props.meal.ingredients.reduce((s, i) => s + (i.protein ?? 0), 0),
);
const totalCarbs = computed(() =>
    props.meal.ingredients.reduce((s, i) => s + (i.carbs ?? 0), 0),
);
const totalFats = computed(() =>
    props.meal.ingredients.reduce((s, i) => s + (i.fats ?? 0), 0),
);
</script>
