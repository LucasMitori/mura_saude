<template>
    <div class="settings-page">
        <div class="d-flex align-center mb-4">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold d-flex align-center">
                    <v-icon size="28" color="primary" class="mr-2">mdi-cog</v-icon>
                    Configurações
                </h1>
                <p class="text-body-2 text-grey mb-0">
                    Personalização do aplicativo (somente admin)
                </p>
            </div>
            <v-spacer />
            <v-btn icon="mdi-arrow-left" variant="tonal" @click="$router.back()" />
        </div>

        <v-row>
            <v-col cols="12" md="7">
                <v-card>
                    <v-card-title class="d-flex align-center pa-4">
                        <v-icon start>mdi-image-area</v-icon>
                        Imagem de Fundo do Login
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                            <span class="text-caption">
                                Esta imagem aparece como fundo da página de login.
                                Diferente das fotos de refeições, ela é
                                <strong>permanente</strong> — nunca é excluída
                                automaticamente após 30 dias. JPEG, PNG ou WebP —
                                imagens grandes são comprimidas automaticamente.
                            </span>
                        </v-alert>

                        <v-file-input
                            v-model="file"
                            accept="image/jpeg,image/png,image/webp"
                            label="Selecionar imagem de fundo"
                            prepend-icon=""
                            prepend-inner-icon="mdi-image-plus"
                            variant="outlined"
                            density="comfortable"
                            show-size
                            clearable
                            :error-messages="fileError ? [fileError] : []"
                            :messages="fileHint ? [fileHint] : []"
                            @update:model-value="onFilePicked"
                        />

                        <v-img
                            v-if="previewUrl"
                            :src="previewUrl"
                            max-height="260"
                            cover
                            eager
                            class="rounded-lg mb-3"
                        />

                        <div class="d-flex ga-2">
                            <v-btn
                                color="primary"
                                variant="flat"
                                prepend-icon="mdi-content-save"
                                :disabled="!file"
                                :loading="saving"
                                @click="save"
                            >
                                Salvar Fundo
                            </v-btn>
                            <v-spacer />
                            <v-btn
                                v-if="hasCurrent"
                                color="error"
                                variant="tonal"
                                prepend-icon="mdi-delete"
                                :loading="removing"
                                @click="remove"
                            >
                                Remover Fundo
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="5">
                <v-card>
                    <v-card-title class="d-flex align-center pa-4">
                        <v-icon start>mdi-eye</v-icon>
                        Fundo Atual
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                        <v-img
                            v-if="currentUrl"
                            :src="currentUrl"
                            max-height="260"
                            cover
                            eager
                            class="rounded-lg"
                        />
                        <p v-else class="text-grey text-center py-6 mb-0">
                            Nenhuma imagem de fundo definida — o login usa o tema padrão.
                        </p>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- ===== PRIVACY ===== -->
        <v-row class="mt-1">
            <v-col cols="12">
                <v-card>
                    <v-card-title class="d-flex align-center pa-4">
                        <v-icon start>mdi-shield-lock</v-icon>
                        Privacidade
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                        <div class="d-flex align-center flex-wrap ga-3">
                            <v-avatar
                                :color="privacy.hideWeight ? 'warning' : 'grey'"
                                variant="flat"
                                size="44"
                            >
                                <v-icon color="white">
                                    {{ privacy.hideWeight ? "mdi-eye-off" : "mdi-eye" }}
                                </v-icon>
                            </v-avatar>
                            <div class="flex-grow-1" style="min-width: 220px">
                                <p class="text-body-1 font-weight-medium mb-0">
                                    Ocultar meu peso dos usuários comuns
                                </p>
                                <p class="text-caption text-medium-emphasis mb-0">
                                    Como em apps de banco: quando ativado, usuários comuns
                                    veem <strong>"—"</strong> no lugar do peso em todo o app
                                    (dashboard, relatórios, medições e gráficos). Você (admin)
                                    e profissionais (nutricionista / personal) continuam vendo
                                    normalmente.
                                </p>
                            </div>
                            <v-switch
                                v-model="privacy.hideWeight"
                                color="warning"
                                inset
                                hide-details
                                :loading="privacyLoading"
                                @update:model-value="savePrivacy"
                            />
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

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
import { useAuthStore } from "~/stores/auth.store";

definePageMeta({ requiresPermission: "users.manage" });

const authStore = useAuthStore();
const { validateImageFile, compressImageFile } = useMealImages();

const file = ref<File | null>(null);
const fileError = ref<string | null>(null);
const fileHint = ref<string | null>(null);
const previewUrl = ref<string | null>(null);
const currentUrl = ref<string | null>(null);
const hasCurrent = ref(false);
const saving = ref(false);
const removing = ref(false);

const snackbar = ref({ show: false, message: "", color: "success" });
function notify(message: string, color: "success" | "error" = "success") {
    snackbar.value = { show: true, message, color };
}

// ===== Privacy =====
const privacy = ref({ hideWeight: false });
const privacyLoading = ref(false);

async function loadPrivacy() {
    try {
        privacy.value = await $fetch<{ hideWeight: boolean }>("/api/settings/privacy", {
            headers: authStore.authHeaders,
        });
    } catch {
        privacy.value = { hideWeight: false };
    }
}

async function savePrivacy(value: boolean | null) {
    privacyLoading.value = true;
    try {
        await $fetch("/api/settings/privacy", {
            method: "PUT",
            body: { hideWeight: value === true },
            headers: authStore.authHeaders,
        });
        notify(value ? "Peso agora está oculto para usuários comuns" : "Peso visível novamente");
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        notify(err?.data?.message || err?.message || "Erro ao salvar", "error");
        // Revert the toggle on failure.
        privacy.value.hideWeight = value !== true;
    } finally {
        privacyLoading.value = false;
    }
}

async function onFilePicked(value: File | File[] | null) {
    const raw = Array.isArray(value) ? (value[0] ?? null) : value;
    fileError.value = null;
    fileHint.value = null;
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = null;
    }
    if (!raw) return;
    // Large photos are downscaled/re-encoded client-side so the upload fits
    // every host's request limit (Vercel caps bodies at ~4.5 MB).
    const f = await compressImageFile(raw);
    const problem = validateImageFile(f);
    if (problem) {
        fileError.value = problem;
        file.value = null;
        return;
    }
    if (f !== raw) {
        fileHint.value = `Imagem comprimida de ${(raw.size / (1024 * 1024)).toFixed(1)} MB para ${(f.size / (1024 * 1024)).toFixed(1)} MB.`;
    }
    file.value = f;
    previewUrl.value = URL.createObjectURL(f);
}

async function loadCurrent() {
    // Public endpoint; cache-busted so a fresh save shows immediately.
    try {
        const blob = await $fetch<Blob>(`/api/settings/login-background?t=${Date.now()}`, {
            responseType: "blob",
        });
        if (currentUrl.value) URL.revokeObjectURL(currentUrl.value);
        currentUrl.value = URL.createObjectURL(blob);
        hasCurrent.value = true;
    } catch {
        currentUrl.value = null;
        hasCurrent.value = false;
    }
}

function fileToDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
        reader.readAsDataURL(f);
    });
}

async function save() {
    if (!file.value) return;
    saving.value = true;
    try {
        const dataUrl = await fileToDataUrl(file.value);
        await $fetch("/api/settings/login-background", {
            method: "PUT",
            body: { dataUrl },
            headers: authStore.authHeaders,
        });
        notify("Fundo do login atualizado");
        file.value = null;
        if (previewUrl.value) {
            URL.revokeObjectURL(previewUrl.value);
            previewUrl.value = null;
        }
        await loadCurrent();
    } catch (e: unknown) {
        const err = e as {
            status?: number;
            statusCode?: number;
            data?: { message?: string };
            message?: string;
        };
        // Hosts like Vercel return a bare 413 (no JSON) when the request body
        // exceeds their platform limit — give a useful message instead.
        const is413 = err?.status === 413 || err?.statusCode === 413;
        notify(
            err?.data?.message ||
                (is413
                    ? "A imagem ficou grande demais para o servidor — tente uma imagem menor."
                    : err?.message || "Erro ao salvar"),
            "error",
        );
    } finally {
        saving.value = false;
    }
}

async function remove() {
    removing.value = true;
    try {
        await $fetch("/api/settings/login-background", {
            method: "DELETE",
            headers: authStore.authHeaders,
        });
        notify("Fundo removido — o login volta ao tema padrão");
        await loadCurrent();
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        notify(err?.data?.message || err?.message || "Erro ao remover", "error");
    } finally {
        removing.value = false;
    }
}

onMounted(() => {
    loadCurrent();
    loadPrivacy();
});
</script>

<style scoped>
.settings-page {
    width: 100%;
}
</style>
