<template>
    <!-- Photo auto-deleted by the 30-day retention policy -->
    <v-alert
        v-if="state === 'expired'"
        type="info"
        variant="tonal"
        density="compact"
        class="my-1"
    >
        <template #prepend>
            <v-icon size="18">mdi-image-off-outline</v-icon>
        </template>
        <span class="text-caption">
            A foto desta refeição foi removida automaticamente após
            {{ MEAL_IMAGE_TTL_DAYS }} dias.
        </span>
    </v-alert>

    <!-- Ref exists but binary is gone before its time (deleted via galeria) -->
    <v-alert
        v-else-if="state === 'missing'"
        type="warning"
        variant="tonal"
        density="compact"
        class="my-1"
    >
        <template #prepend>
            <v-icon size="18">mdi-image-off-outline</v-icon>
        </template>
        <span class="text-caption">Foto não encontrada (removida).</span>
    </v-alert>

    <div v-else class="meal-image-thumb">
        <v-skeleton-loader
            v-if="state === 'loading'"
            type="image"
            :height="height"
            :width="height * 1.4"
            class="rounded-lg"
        />
        <template v-else-if="state === 'ready' && url">
            <v-img
                :src="url"
                :height="height"
                :width="height * 1.4"
                cover
                eager
                class="rounded-lg thumb-img"
                @click="enlarged = true"
            >
                <template #placeholder>
                    <v-skeleton-loader type="image" :height="height" />
                </template>
            </v-img>
            <p v-if="daysLeft <= 7" class="text-caption text-warning mt-1 mb-0">
                <v-icon size="12">mdi-clock-alert-outline</v-icon>
                Expira em {{ daysLeft }} {{ daysLeft === 1 ? "dia" : "dias" }}
            </p>

            <v-dialog v-model="enlarged" max-width="900">
                <v-card>
                    <v-img :src="url" max-height="80vh" contain eager />
                    <v-card-actions>
                        <span class="text-caption text-medium-emphasis ml-2">
                            Enviada em {{ uploadedLabel }} · expira em
                            {{ daysLeft }} {{ daysLeft === 1 ? "dia" : "dias" }}
                        </span>
                        <v-spacer />
                        <v-btn variant="text" @click="enlarged = false">Fechar</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MealImageRef } from "#shared/meal-images";
import {
    isMealImageExpired,
    mealImageDaysLeft,
    MEAL_IMAGE_TTL_DAYS,
} from "#shared/meal-images";

const props = withDefaults(
    defineProps<{
        image: MealImageRef;
        height?: number;
    }>(),
    { height: 110 },
);

const { getImageObjectUrl } = useMealImages();

const state = ref<"loading" | "ready" | "expired" | "missing">("loading");
const url = ref<string | null>(null);
const enlarged = ref(false);

const daysLeft = computed(() => mealImageDaysLeft(props.image));
const uploadedLabel = computed(() => {
    try {
        return format(parseISO(props.image.uploadedAt), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
        });
    } catch {
        return props.image.uploadedAt;
    }
});

async function load() {
    if (isMealImageExpired(props.image)) {
        state.value = "expired";
        return;
    }
    state.value = "loading";
    try {
        url.value = await getImageObjectUrl(props.image.id);
        state.value = "ready";
    } catch {
        // Binary already gone: past the TTL window it's an expiry, otherwise it
        // was deleted manually (e.g. by the admin in the gallery).
        state.value = isMealImageExpired(props.image) ? "expired" : "missing";
    }
}

watch(() => props.image.id, load);
onMounted(load);
</script>

<style scoped>
.thumb-img {
    cursor: zoom-in;
    flex: 0 0 auto;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.thumb-img:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
</style>
