<template>
    <v-card>
        <v-card-title>Add Meal</v-card-title>
        <v-card-text>
            <v-select
                v-model="form.type"
                :items="mealTypes"
                label="Meal Type"
            />
            <v-text-field v-model="form.name" label="Meal Name" />

            <h3 class="text-subtitle-1 mt-4 mb-2">Ingredients</h3>

            <div
                v-for="(ing, index) in form.ingredients"
                :key="index"
                class="mb-2"
            >
                <v-row dense>
                    <v-col cols="3">
                        <v-text-field
                            v-model="ing.name"
                            label="Name"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="2">
                        <v-text-field
                            v-model.number="ing.grams"
                            label="Grams"
                            type="number"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="2">
                        <v-text-field
                            v-model.number="ing.calories"
                            label="Calories"
                            type="number"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="1">
                        <v-text-field
                            v-model.number="ing.protein"
                            label="Prot"
                            type="number"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="1">
                        <v-text-field
                            v-model.number="ing.carbs"
                            label="Carbs"
                            type="number"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="1">
                        <v-text-field
                            v-model.number="ing.fats"
                            label="Fats"
                            type="number"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="1">
                        <v-btn
                            icon="mdi-delete"
                            size="small"
                            color="error"
                            variant="text"
                            @click="removeIngredient(index)"
                        />
                    </v-col>
                </v-row>
            </div>

            <v-btn
                variant="outlined"
                size="small"
                @click="addIngredient"
                class="mt-2"
            >
                <v-icon start>mdi-plus</v-icon>
                Add Ingredient
            </v-btn>
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn @click="$emit('cancel')">Cancel</v-btn>
            <v-btn color="primary" @click="submit">Save Meal</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { MealType, Ingredient, Meal } from "../shared/types/daily";

const emit = defineEmits<{
    submit: [meal: Meal];
    cancel: [];
}>();

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface IngredientForm {
    name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

const form = ref({
    type: "lunch" as MealType,
    name: "",
    ingredients: [createEmptyIngredient()] as IngredientForm[],
});

function createEmptyIngredient(): IngredientForm {
    return { name: "", grams: 0, calories: 0, protein: 0, carbs: 0, fats: 0 };
}

function addIngredient() {
    form.value.ingredients.push(createEmptyIngredient());
}

function removeIngredient(index: number) {
    form.value.ingredients.splice(index, 1);
}

function submit() {
    const meal: Meal = {
        type: form.value.type,
        name: form.value.name,
        ingredients: form.value.ingredients.map((i) => ({
            name: i.name,
            grams: i.grams,
            calories: i.calories,
            protein: i.protein || undefined,
            carbs: i.carbs || undefined,
            fats: i.fats || undefined,
        })),
    };
    emit("submit", meal);
}
</script>
