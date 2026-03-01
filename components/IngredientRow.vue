<template>
    <v-row dense>
        <v-col cols="3">
            <v-text-field
                :model-value="ingredient.name"
                label="Name"
                density="compact"
                hide-details
                @update:model-value="update('name', $event)"
            />
        </v-col>
        <v-col cols="2">
            <v-text-field
                :model-value="ingredient.grams"
                label="Grams"
                type="number"
                density="compact"
                hide-details
                @update:model-value="update('grams', Number($event))"
            />
        </v-col>
        <v-col cols="2">
            <v-text-field
                :model-value="ingredient.calories"
                label="Calories"
                type="number"
                density="compact"
                hide-details
                @update:model-value="update('calories', Number($event))"
            />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import type { Ingredient } from "../shared/types/daily";

const props = defineProps<{
    ingredient: Ingredient;
}>();

const emit = defineEmits<{
    update: [field: string, value: string | number];
}>();

function update(field: string, value: string | number) {
    emit("update", field, value);
}
</script>
