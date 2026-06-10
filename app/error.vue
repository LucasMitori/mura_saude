<template>
    <v-app :theme="'dark'">
        <v-main class="error-main">
            <div class="error-wrap">
                <v-card class="error-card pa-6 pa-md-10 text-center" elevation="12" rounded="xl">
                    <v-icon :color="iconColor" size="72" class="mb-4">
                        {{ icon }}
                    </v-icon>

                    <div class="error-code">{{ statusCode }}</div>

                    <h1 class="text-h5 font-weight-bold mb-2">{{ title }}</h1>

                    <p class="text-body-2 text-medium-emphasis mb-6">
                        {{ description }}
                    </p>

                    <div class="d-flex flex-wrap justify-center ga-3">
                        <v-btn
                            color="primary"
                            size="large"
                            prepend-icon="mdi-view-dashboard"
                            @click="goHome"
                        >
                            Ir para o Dashboard
                        </v-btn>
                        <v-btn
                            variant="tonal"
                            size="large"
                            prepend-icon="mdi-refresh"
                            @click="reload"
                        >
                            Tentar novamente
                        </v-btn>
                    </div>

                    <v-expansion-panels
                        v-if="showDetails && error?.message"
                        class="mt-6 text-left"
                        variant="accordion"
                    >
                        <v-expansion-panel title="Detalhes técnicos">
                            <template #text>
                                <pre class="error-detail">{{ error.message }}</pre>
                            </template>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </v-card>

                <p class="text-caption text-medium-emphasis mt-6">
                    Mura Saúde · acompanhamento de saúde
                </p>
            </div>
        </v-main>
    </v-app>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const statusCode = computed(() => props.error?.statusCode || 500);
const is404 = computed(() => statusCode.value === 404);

// Surface the raw message only in dev to avoid leaking server internals in prod.
const showDetails = computed(() => import.meta.dev);

const icon = computed(() => (is404.value ? "mdi-map-marker-question" : "mdi-alert-circle-outline"));
const iconColor = computed(() => (is404.value ? "info" : "error"));

const title = computed(() =>
    is404.value ? "Página não encontrada" : "Algo deu errado",
);

const description = computed(() =>
    is404.value
        ? "O endereço que você tentou acessar não existe ou foi movido."
        : "Encontramos um problema inesperado. Tente novamente em instantes.",
);

function goHome() {
    clearError({ redirect: "/" });
}

function reload() {
    clearError({ redirect: useRoute().fullPath });
}
</script>

<style scoped>
.error-main {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
        radial-gradient(at 0% 0%, rgba(76, 175, 80, 0.08), transparent 42%),
        radial-gradient(at 100% 100%, rgba(3, 218, 198, 0.08), transparent 42%),
        #0e1014;
}
.error-wrap {
    width: 100%;
    max-width: 540px;
    padding: 24px;
    margin: 0 auto;
}
.error-card {
    background: rgba(22, 25, 31, 0.92) !important;
    border: 1px solid rgba(255, 255, 255, 0.06);
}
.error-code {
    font-size: 4.5rem;
    line-height: 1;
    font-weight: 800;
    background: linear-gradient(135deg, #4caf50, #03dac6);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
}
.error-detail {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.75rem;
    opacity: 0.8;
}
</style>
