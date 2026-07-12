<template>
    <div class="gallery-page">
        <div class="d-flex align-center mb-4 flex-wrap ga-2">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold d-flex align-center">
                    <v-icon size="28" color="primary" class="mr-2">mdi-image-multiple</v-icon>
                    Galeria de Fotos
                </h1>
                <p class="text-body-2 text-grey mb-0">
                    Fotos das refeições, organizadas por dia. Cada foto é
                    excluída automaticamente após {{ ttlDays }} dias.
                </p>
            </div>
            <v-spacer />
            <v-btn
                variant="tonal"
                prepend-icon="mdi-refresh"
                :loading="loading"
                @click="load"
            >
                Atualizar
            </v-btn>
        </div>

        <!-- Storage usage -->
        <v-row class="mb-2">
            <v-col cols="12" sm="4">
                <v-card variant="tonal" color="primary">
                    <v-card-text class="d-flex align-center ga-3">
                        <v-icon size="32">mdi-image-multiple-outline</v-icon>
                        <div>
                            <p class="text-h5 font-weight-bold mb-0">{{ totalCount }}</p>
                            <p class="text-caption mb-0">fotos armazenadas</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" sm="4">
                <v-card variant="tonal" color="info">
                    <v-card-text class="d-flex align-center ga-3">
                        <v-icon size="32">mdi-database</v-icon>
                        <div>
                            <p class="text-h5 font-weight-bold mb-0">
                                {{ formatBytes(totalBytes) }}
                            </p>
                            <p class="text-caption mb-0">espaço usado por fotos</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" sm="4">
                <v-card variant="tonal" color="warning">
                    <v-card-text class="d-flex align-center ga-3">
                        <v-icon size="32">mdi-folder-clock-outline</v-icon>
                        <div>
                            <p class="text-h5 font-weight-bold mb-0">{{ days.length }}</p>
                            <p class="text-caption mb-0">dias com fotos</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

        <div v-if="loading && days.length === 0" class="text-center py-10">
            <v-progress-circular indeterminate color="primary" size="64" />
        </div>

        <v-alert v-else-if="days.length === 0" type="info" variant="tonal">
            Nenhuma foto armazenada. As fotos enviadas nas refeições aparecem
            aqui, agrupadas por dia.
        </v-alert>

        <!-- Day folders -->
        <v-expansion-panels v-else v-model="openPanels" multiple variant="accordion">
            <v-expansion-panel v-for="day in days" :key="day.date" :value="day.date">
                <v-expansion-panel-title>
                    <v-icon start color="amber-darken-2">mdi-folder-image</v-icon>
                    <span class="font-weight-medium">{{ formatDay(day.date) }}</span>
                    <v-chip size="x-small" class="ml-3" variant="tonal" color="primary">
                        {{ day.count }} {{ day.count === 1 ? "foto" : "fotos" }}
                    </v-chip>
                    <v-chip size="x-small" class="ml-2" variant="tonal" color="info">
                        {{ formatBytes(day.totalBytes) }}
                    </v-chip>
                    <v-spacer />
                    <v-btn
                        size="x-small"
                        variant="text"
                        color="error"
                        prepend-icon="mdi-delete-sweep"
                        class="mr-2"
                        @click.stop="confirmDeleteDay(day)"
                    >
                        Excluir dia
                    </v-btn>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                    <v-row>
                        <v-col
                            v-for="img in day.images"
                            :key="img.id"
                            cols="12"
                            sm="6"
                            md="4"
                            lg="3"
                        >
                            <v-card variant="outlined" class="gallery-card">
                                <GalleryThumb
                                    :image-id="img.id"
                                    @view="openViewer(img)"
                                />
                                <v-card-text class="pb-2">
                                    <div class="d-flex align-center ga-1 flex-wrap">
                                        <v-chip size="x-small" variant="tonal" color="primary">
                                            {{ mealTypeLabel(img.mealType) }}
                                        </v-chip>
                                        <v-chip v-if="img.mealTime" size="x-small" variant="outlined">
                                            <v-icon start size="10">mdi-clock-outline</v-icon>
                                            {{ img.mealTime }}
                                        </v-chip>
                                    </div>
                                    <p class="text-body-2 font-weight-medium mt-2 mb-1 text-truncate">
                                        {{ img.mealLabel || "Sem nome" }}
                                    </p>
                                    <p class="text-caption text-medium-emphasis mb-0">
                                        {{ formatBytes(img.size) }} ·
                                        expira {{ expiryLabel(img.expiresAt) }}
                                    </p>
                                </v-card-text>
                                <v-card-actions class="pt-0">
                                    <v-btn
                                        size="small"
                                        variant="text"
                                        prepend-icon="mdi-open-in-new"
                                        :to="`/daily/${day.date}`"
                                    >
                                        Ver dia
                                    </v-btn>
                                    <v-spacer />
                                    <v-btn
                                        size="small"
                                        variant="text"
                                        color="error"
                                        icon="mdi-delete"
                                        @click="confirmDeleteImage(img)"
                                    />
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>

        <!-- Fullscreen viewer -->
        <v-dialog v-model="viewer.show" max-width="900">
            <v-card v-if="viewer.image">
                <v-img v-if="viewer.url" :src="viewer.url" max-height="80vh" contain eager />
                <v-card-actions>
                    <span class="text-caption text-medium-emphasis ml-2">
                        {{ viewer.image.mealLabel || mealTypeLabel(viewer.image.mealType) }}
                        · {{ viewer.image.mealTime }}
                        · {{ formatBytes(viewer.image.size) }}
                    </span>
                    <v-spacer />
                    <v-btn
                        color="error"
                        variant="text"
                        prepend-icon="mdi-delete"
                        @click="confirmDeleteImage(viewer.image)"
                    >
                        Excluir
                    </v-btn>
                    <v-btn variant="text" @click="viewer.show = false">Fechar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Confirm dialog -->
        <v-dialog v-model="confirmDialog.show" max-width="440">
            <v-card>
                <v-card-title>{{ confirmDialog.title }}</v-card-title>
                <v-card-text>{{ confirmDialog.message }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="confirmDialog.show = false">Cancelar</v-btn>
                    <v-btn
                        color="error"
                        variant="elevated"
                        :loading="deleting"
                        @click="confirmDialog.onConfirm"
                    >
                        Excluir
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            timeout="3500"
            location="bottom"
        >
            {{ snackbar.message }}
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MEAL_TYPE_LABELS, type MealType } from "#shared/types/daily";
import { formatBytes } from "#shared/meal-images";
import type { GalleryDay, GalleryImage } from "~/composables/useMealImages";

definePageMeta({ requiresPermission: "users.manage" });

const { fetchGallery, adminDeleteImage, getImageObjectUrl } = useMealImages();

const days = ref<GalleryDay[]>([]);
const totalCount = ref(0);
const totalBytes = ref(0);
const ttlDays = ref(30);
const loading = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);
const openPanels = ref<string[]>([]);

const snackbar = ref({ show: false, message: "", color: "success" });
function notify(message: string, color: "success" | "error" = "success") {
    snackbar.value = { show: true, message, color };
}

const viewer = ref<{ show: boolean; image: GalleryImage | null; url: string | null }>({
    show: false,
    image: null,
    url: null,
});

const confirmDialog = ref<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}>({ show: false, title: "", message: "", onConfirm: () => {} });

function mealTypeLabel(type: string): string {
    return MEAL_TYPE_LABELS[type as MealType] || type || "Refeição";
}

function formatDay(date: string): string {
    try {
        return format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
        return date;
    }
}

function expiryLabel(expiresAt: string): string {
    try {
        return formatDistanceToNow(parseISO(expiresAt), { addSuffix: true, locale: ptBR });
    } catch {
        return expiresAt;
    }
}

async function load() {
    loading.value = true;
    error.value = null;
    try {
        const res = await fetchGallery();
        days.value = res.days;
        totalCount.value = res.totalCount;
        totalBytes.value = res.totalBytes;
        ttlDays.value = res.ttlDays;
        // Open the most recent day folder by default.
        if (res.days.length > 0 && openPanels.value.length === 0) {
            openPanels.value = [res.days[0]!.date];
        }
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        error.value = err?.data?.message || err?.message || "Erro ao carregar galeria";
    } finally {
        loading.value = false;
    }
}

async function openViewer(img: GalleryImage) {
    viewer.value = { show: true, image: img, url: null };
    try {
        viewer.value.url = await getImageObjectUrl(img.id);
    } catch {
        notify("Não foi possível carregar a imagem", "error");
        viewer.value.show = false;
    }
}

function confirmDeleteImage(img: GalleryImage) {
    confirmDialog.value = {
        show: true,
        title: "Excluir foto?",
        message: `A foto de "${img.mealLabel || mealTypeLabel(img.mealType)}" (${formatBytes(img.size)}) será excluída permanentemente. A refeição continua registrada.`,
        onConfirm: async () => {
            deleting.value = true;
            try {
                await adminDeleteImage(img.id);
                notify(`Foto excluída — ${formatBytes(img.size)} liberados`);
                viewer.value.show = false;
                confirmDialog.value.show = false;
                await load();
            } catch (e: unknown) {
                const err = e as { data?: { message?: string }; message?: string };
                notify(err?.data?.message || err?.message || "Erro ao excluir", "error");
            } finally {
                deleting.value = false;
            }
        },
    };
}

function confirmDeleteDay(day: GalleryDay) {
    confirmDialog.value = {
        show: true,
        title: `Excluir todas as fotos de ${formatDay(day.date)}?`,
        message: `${day.count} foto(s) — ${formatBytes(day.totalBytes)} — serão excluídas permanentemente. As refeições continuam registradas.`,
        onConfirm: async () => {
            deleting.value = true;
            let ok = 0;
            let freed = 0;
            try {
                for (const img of day.images) {
                    const res = await adminDeleteImage(img.id);
                    ok++;
                    freed += res.freedBytes || 0;
                }
                notify(`${ok} foto(s) excluídas — ${formatBytes(freed)} liberados`);
            } catch (e: unknown) {
                const err = e as { data?: { message?: string }; message?: string };
                notify(
                    `${ok} de ${day.count} excluídas; erro: ${err?.data?.message || err?.message || "?"}`,
                    "error",
                );
            } finally {
                deleting.value = false;
                confirmDialog.value.show = false;
                await load();
            }
        },
    };
}

onMounted(load);
</script>

<style scoped>
.gallery-page {
    width: 100%;
}
.gallery-card {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.gallery-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
}
</style>
