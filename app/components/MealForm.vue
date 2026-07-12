<template>
    <v-card class="meal-form-card">
        <v-card-title class="d-flex align-center pa-4">
            <v-icon start :color="mealColor">{{ mealIcon }}</v-icon>
            <span>{{ isEditing ? "Editar Refeição" : "Nova Refeição" }}</span>
            <v-spacer />
            <v-chip
                v-if="totalCalories > 0"
                size="small"
                color="warning"
                class="mr-2"
            >
                {{ totalCalories }} kcal
            </v-chip>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
            <v-row density="comfortable">
                <v-col cols="12" md="6">
                    <v-select
                        v-model="form.type"
                        :items="mealTypeOptions"
                        item-title="label"
                        item-value="value"
                        label="Período / Tipo"
                        prepend-inner-icon="mdi-clock-outline"
                    />
                </v-col>
                <v-col cols="12" md="3">
                    <AppTimeField
                        v-model="form.time"
                        label="Horário"
                        prepend-inner-icon="mdi-clock"
                        variant="outlined"
                        density="comfortable"
                    />
                </v-col>
                <v-col cols="12" md="3">
                    <v-text-field
                        v-model="form.label"
                        label="Nome / Descrição"
                        prepend-inner-icon="mdi-text"
                        placeholder="Ex: Frango com batata"
                    />
                </v-col>
            </v-row>

            <h3 class="text-subtitle-1 mb-2 mt-3">
                <v-icon start size="20">mdi-food-apple</v-icon>
                Alimentos
            </h3>

            <FoodSearch class="mb-2" @select="onFoodSelected" />
            <p class="text-caption text-medium-emphasis mb-3">
                <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
                Busque um alimento para preencher calorias e macros
                automaticamente — ajuste o peso (g) e os valores se recalculam.
            </p>

            <v-table density="compact" class="mb-2">
                <thead>
                    <tr>
                        <th>Alimento</th>
                        <th style="width: 110px">Peso (g)</th>
                        <th style="width: 105px">Kcal</th>
                        <th style="width: 100px">Prot</th>
                        <th style="width: 100px">Carbs</th>
                        <th style="width: 100px">Gord</th>
                        <th style="width: 100px">Fibra</th>
                        <th style="width: 44px"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(food, index) in form.foods"
                        :key="index"
                        class="meal-row"
                    >
                        <td>
                            <v-text-field
                                v-model="food.name"
                                density="compact"
                                variant="plain"
                                hide-details
                                placeholder="Nome"
                            />
                        </td>
                        <td>
                            <v-number-input
                                v-model="food.weightGrams"
                                :min="0"
                                control-variant="stacked"
                                density="compact"
                                variant="plain"
                                hide-details
                                @update:model-value="rescaleRow(index)"
                            />
                        </td>
                        <td>
                            <v-number-input
                                v-model="food.calories"
                                :min="0"
                                control-variant="stacked"
                                density="compact"
                                variant="plain"
                                hide-details
                            />
                        </td>
                        <td>
                            <v-number-input
                                v-model="food.protein"
                                :min="0"
                                control-variant="stacked"
                                density="compact"
                                variant="plain"
                                hide-details
                            />
                        </td>
                        <td>
                            <v-number-input
                                v-model="food.carbs"
                                :min="0"
                                control-variant="stacked"
                                density="compact"
                                variant="plain"
                                hide-details
                            />
                        </td>
                        <td>
                            <v-number-input
                                v-model="food.fats"
                                :min="0"
                                control-variant="stacked"
                                density="compact"
                                variant="plain"
                                hide-details
                            />
                        </td>
                        <td>
                            <v-number-input
                                v-model="food.fiber"
                                :min="0"
                                control-variant="stacked"
                                density="compact"
                                variant="plain"
                                hide-details
                            />
                        </td>
                        <td>
                            <v-btn
                                icon="mdi-close"
                                size="x-small"
                                variant="text"
                                color="error"
                                @click="removeFood(index)"
                            />
                        </td>
                    </tr>
                    <tr v-if="form.foods.length === 0">
                        <td colspan="8" class="text-center text-grey py-4">
                            Nenhum alimento adicionado. Clique abaixo para
                            começar.
                        </td>
                    </tr>
                </tbody>
                <tfoot v-if="form.foods.length > 0">
                    <tr class="totals-row">
                        <td class="font-weight-bold">TOTAL</td>
                        <td class="font-weight-bold">{{ totalWeight }}g</td>
                        <td class="font-weight-bold">{{ totalCalories }}</td>
                        <td>{{ totalProtein }}g</td>
                        <td>{{ totalCarbs }}g</td>
                        <td>{{ totalFats }}g</td>
                        <td>{{ totalFiber }}g</td>
                        <td></td>
                    </tr>
                </tfoot>
            </v-table>

            <v-btn
                variant="tonal"
                size="small"
                prepend-icon="mdi-plus"
                color="primary"
                @click="addFood"
            >
                Adicionar Alimento
            </v-btn>

            <v-textarea
                v-model="form.notes"
                label="Observações"
                rows="2"
                prepend-inner-icon="mdi-note-text-outline"
                class="mt-3"
            />

            <h3 class="text-subtitle-1 mb-2">
                <v-icon start size="20">mdi-camera</v-icon>
                Foto da Refeição
            </h3>
            <p class="text-caption text-medium-emphasis mb-2">
                <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
                JPEG, PNG ou WebP até 5 MB. A foto é excluída automaticamente
                após {{ MEAL_IMAGE_TTL_DAYS }} dias.
            </p>
            <v-file-input
                v-model="imageFile"
                accept="image/jpeg,image/png,image/webp"
                label="Selecionar foto"
                prepend-icon=""
                prepend-inner-icon="mdi-camera-plus"
                variant="outlined"
                density="comfortable"
                show-size
                clearable
                :error-messages="imageError ? [imageError] : []"
                @update:model-value="onImagePicked"
            />
            <div v-if="imagePreviewUrl" class="d-flex align-center ga-3 mb-2">
                <v-img
                    :src="imagePreviewUrl"
                    height="120"
                    width="168"
                    cover
                    class="rounded-lg flex-grow-0"
                />
                <span class="text-caption text-medium-emphasis">
                    Nova foto — será enviada ao salvar.
                </span>
            </div>
            <template v-else-if="isEditing && form.image && !removeCurrentImage">
                <div class="d-flex align-center ga-3 mb-2">
                    <MealImageThumb :image="form.image" :height="120" />
                    <v-btn
                        size="small"
                        variant="tonal"
                        color="error"
                        prepend-icon="mdi-image-remove"
                        @click="removeCurrentImage = true"
                    >
                        Remover foto
                    </v-btn>
                </div>
            </template>
            <v-alert
                v-else-if="removeCurrentImage"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-2"
            >
                A foto atual será removida ao salvar.
                <v-btn
                    size="x-small"
                    variant="text"
                    class="ml-2"
                    @click="removeCurrentImage = false"
                >
                    Desfazer
                </v-btn>
            </v-alert>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
            <v-btn variant="text" @click="$emit('cancel')">Cancelar</v-btn>
            <v-spacer />
            <v-btn
                color="primary"
                variant="elevated"
                :disabled="!canSave"
                prepend-icon="mdi-content-save"
                @click="submit"
            >
                {{ isEditing ? "Salvar Alterações" : "Salvar Refeição" }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Meal, MealType, FoodItem } from "#shared/types/daily";
import type { NutritionFood, NutritionPer100g } from "#shared/types/nutrition";
import { MEAL_IMAGE_TTL_DAYS } from "#shared/meal-images";
import type { MealImageUpdate } from "~/composables/useMealImages";

// A food row may carry a transient `_per100g` basis (when picked from Open Food
// Facts) so editing the weight rescales calories/macros. It is stripped before
// the meal is emitted — the persisted schema only knows the absolute FoodItem.
interface FoodRow extends FoodItem {
    _per100g?: NutritionPer100g;
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

const props = defineProps<{
    existing?: Meal | null;
    defaultType?: MealType;
}>();

const emit = defineEmits<{
    submit: [meal: Meal, image: MealImageUpdate];
    cancel: [];
}>();

// --- Meal photo ---
const { validateImageFile } = useMealImages();
const imageFile = ref<File | null>(null);
const imageError = ref<string | null>(null);
const imagePreviewUrl = ref<string | null>(null);
const removeCurrentImage = ref(false);

function onImagePicked(value: File | File[] | null) {
    const file = Array.isArray(value) ? (value[0] ?? null) : value;
    imageError.value = null;
    if (imagePreviewUrl.value) {
        URL.revokeObjectURL(imagePreviewUrl.value);
        imagePreviewUrl.value = null;
    }
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
        imageError.value = problem;
        imageFile.value = null;
        return;
    }
    imagePreviewUrl.value = URL.createObjectURL(file);
}

const mealTypeOptions: { label: string; value: MealType }[] = [
    { label: "🌅 Pré-Treino", value: "pre_workout" },
    { label: "☕ Café da Manhã", value: "breakfast" },
    { label: "🥪 Lanche da Manhã", value: "morning_snack" },
    { label: "🍽️ Almoço", value: "lunch" },
    { label: "🥧 Lanche da Tarde", value: "afternoon_snack" },
    { label: "🏋️ Pré-Treino (Refeição)", value: "pre_workout_meal" },
    { label: "💪 Pós-Treino", value: "post_workout" },
    { label: "🌙 Jantar", value: "dinner" },
    { label: "🌃 Ceia", value: "supper" },
    { label: "🍿 Lanche", value: "snack" },
];

function buildInitialFood(): FoodItem {
    return {
        name: "",
        weightGrams: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
    };
}

const isEditing = computed(() => !!props.existing?.id);

const form = ref<Meal>(
    props.existing
        ? JSON.parse(JSON.stringify(props.existing))
        : {
              type: props.defaultType || "lunch",
              label: "",
              time: new Date().toTimeString().slice(0, 5),
              foods: [buildInitialFood()],
              totalCalories: 0,
              totalWeight: 0,
              notes: "",
          },
);

watch(
    () => props.existing,
    (val) => {
        if (val) form.value = JSON.parse(JSON.stringify(val));
    },
    { deep: true },
);

const totalCalories = computed(() =>
    Math.round(form.value.foods.reduce((s, f) => s + (Number(f.calories) || 0), 0)),
);
const totalWeight = computed(() =>
    Math.round(form.value.foods.reduce((s, f) => s + (Number(f.weightGrams) || 0), 0)),
);
const totalProtein = computed(() =>
    Math.round(
        form.value.foods.reduce((s, f) => s + (Number(f.protein) || 0), 0) * 10,
    ) / 10,
);
const totalCarbs = computed(() =>
    Math.round(
        form.value.foods.reduce((s, f) => s + (Number(f.carbs) || 0), 0) * 10,
    ) / 10,
);
const totalFats = computed(() =>
    Math.round(
        form.value.foods.reduce((s, f) => s + (Number(f.fats) || 0), 0) * 10,
    ) / 10,
);
const totalFiber = computed(() =>
    Math.round(
        form.value.foods.reduce((s, f) => s + (Number(f.fiber) || 0), 0) * 10,
    ) / 10,
);

const canSave = computed(() => {
    return form.value.foods.some((f) => (f.name || "").trim().length > 0);
});

const mealColor = computed(() => {
    const colors: Record<MealType, string> = {
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
    return colors[form.value.type] || "primary";
});

const mealIcon = computed(() => {
    const icons: Record<MealType, string> = {
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
    return icons[form.value.type] || "mdi-food";
});

function addFood() {
    form.value.foods.push(buildInitialFood());
}

function removeFood(index: number) {
    form.value.foods.splice(index, 1);
}

// Add a food picked from Open Food Facts, scaled to its serving size (or 100 g).
function onFoodSelected(food: NutritionFood) {
    const grams = food.servingSizeGrams || 100;
    const factor = grams / 100;
    const row: FoodRow = {
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        weightGrams: grams,
        calories: Math.round(food.per100g.calories * factor),
        protein: round1(food.per100g.protein * factor),
        carbs: round1(food.per100g.carbs * factor),
        fats: round1(food.per100g.fats * factor),
        fiber: round1(food.per100g.fiber * factor),
        _per100g: { ...food.per100g },
    };
    const foods = form.value.foods as FoodRow[];
    // Replace the empty starter row instead of leaving a blank line above.
    const first = foods[0];
    if (foods.length === 1 && first && !first.name && !first.calories) {
        foods.splice(0, 1, row);
    } else {
        foods.push(row);
    }
}

// Rescale a row's macros from its per-100g basis when the weight changes.
function rescaleRow(index: number) {
    const f = form.value.foods[index] as FoodRow | undefined;
    if (!f?._per100g) return;
    const factor = (Number(f.weightGrams) || 0) / 100;
    f.calories = Math.round(f._per100g.calories * factor);
    f.protein = round1(f._per100g.protein * factor);
    f.carbs = round1(f._per100g.carbs * factor);
    f.fats = round1(f._per100g.fats * factor);
    f.fiber = round1(f._per100g.fiber * factor);
}

function submit() {
    form.value.totalCalories = totalCalories.value;
    form.value.totalWeight = totalWeight.value;
    // Drop transient per-100g basis before persisting.
    const foods = form.value.foods.map((f) => {
        const { _per100g, ...rest } = f as FoodRow;
        return rest as FoodItem;
    });
    emit(
        "submit",
        { ...form.value, foods },
        { file: imageFile.value, remove: removeCurrentImage.value },
    );
}
</script>

<style scoped>
.meal-form-card {
    border-radius: 16px;
}
.meal-row:hover {
    background: rgba(76, 175, 80, 0.05);
}
.totals-row {
    background: rgba(76, 175, 80, 0.08);
    border-top: 2px solid rgba(76, 175, 80, 0.4);
}
</style>
