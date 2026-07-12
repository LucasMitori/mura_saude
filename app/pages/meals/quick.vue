<template>
    <div class="quick-add">
        <div class="d-flex align-center mb-4">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold d-flex align-center">
                    <v-icon size="28" color="primary" class="mr-2">mdi-plus-circle</v-icon>
                    Adicionar Refeição
                </h1>
                <p class="text-body-2 text-grey">
                    Adicione uma refeição específica para qualquer período do dia
                </p>
            </div>
            <v-spacer />
            <v-btn
                icon="mdi-arrow-left"
                variant="tonal"
                @click="$router.back()"
            />
        </div>

        <v-row>
            <v-col cols="12" md="4">
                <v-card class="mb-3">
                    <v-card-title>
                        <v-icon start>mdi-calendar</v-icon>
                        Data
                    </v-card-title>
                    <v-card-text>
                        <AppDateField
                            v-model="date"
                            density="comfortable"
                            variant="outlined"
                            hide-details
                        />
                    </v-card-text>
                </v-card>

                <v-card>
                    <v-card-title>
                        <v-icon start>mdi-clock-fast</v-icon>
                        Atalhos por Período
                    </v-card-title>
                    <v-card-text>
                        <v-list density="compact">
                            <v-list-item
                                v-for="t in mealTypeOptions"
                                :key="t.value"
                                :title="t.label"
                                :prepend-icon="t.icon"
                                @click="quickSelectType(t.value)"
                            />
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="8">
                <MealForm
                    :existing="meal"
                    :default-type="meal.type"
                    @submit="handleSubmit"
                    @cancel="$router.back()"
                />
            </v-col>
        </v-row>

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
import { ref } from "vue";
import { format } from "date-fns";
import type { Meal, MealType } from "#shared/types/daily";

definePageMeta({ requiresPermission: "nutrition.edit" });

const { addMeal } = useDaily();
const { uploadMealImage } = useMealImages();
const router = useRouter();
const route = useRoute();

const date = ref(
    typeof route.query.date === "string" ? route.query.date : format(new Date(), "yyyy-MM-dd"),
);

const meal = ref<Meal>({
    type: (typeof route.query.type === "string" ? route.query.type : "lunch") as MealType,
    label: "",
    time: format(new Date(), "HH:mm"),
    foods: [
        {
            name: "",
            weightGrams: 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            fiber: 0,
        },
    ],
    totalCalories: 0,
    totalWeight: 0,
    notes: "",
});

const mealTypeOptions: { label: string; value: MealType; icon: string }[] = [
    { label: "Pré-Treino", value: "pre_workout", icon: "mdi-run-fast" },
    { label: "Café da Manhã", value: "breakfast", icon: "mdi-coffee" },
    { label: "Lanche da Manhã", value: "morning_snack", icon: "mdi-food-apple" },
    { label: "Almoço", value: "lunch", icon: "mdi-food-fork-drink" },
    { label: "Lanche da Tarde", value: "afternoon_snack", icon: "mdi-cookie" },
    { label: "Pré-Treino (Refeição)", value: "pre_workout_meal", icon: "mdi-dumbbell" },
    { label: "Pós-Treino", value: "post_workout", icon: "mdi-arm-flex" },
    { label: "Jantar", value: "dinner", icon: "mdi-food-turkey" },
    { label: "Ceia", value: "supper", icon: "mdi-cup" },
    { label: "Lanche", value: "snack", icon: "mdi-food" },
];

const snackbar = ref({ show: false, message: "", color: "success" });
function notify(message: string, color: "success" | "error" = "success") {
    snackbar.value = { show: true, message, color };
}

function quickSelectType(type: MealType) {
    meal.value.type = type;
    meal.value.time = format(new Date(), "HH:mm");
}

async function handleSubmit(m: Meal, image: { file: File | null; remove: boolean }) {
    try {
        const res = await addMeal(date.value, m);
        if (image.file && res.mealId) {
            try {
                await uploadMealImage(date.value, res.mealId, image.file);
            } catch (imgErr: unknown) {
                // The meal itself was saved — surface the photo failure clearly.
                const err = imgErr as { data?: { message?: string }; message?: string };
                notify(
                    `Refeição salva, mas a foto falhou: ${err?.data?.message || err?.message || "erro"}`,
                    "error",
                );
                setTimeout(() => navigateTo(`/daily/${date.value}`), 1500);
                return;
            }
        }
        notify("Refeição adicionada com sucesso!");
        setTimeout(() => navigateTo(`/daily/${date.value}`), 600);
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        notify(err?.data?.message || err?.message || "Erro ao salvar", "error");
    }
}
</script>

<style scoped>
.quick-add {
    width: 100%;
    margin: 0 auto;
}
</style>
