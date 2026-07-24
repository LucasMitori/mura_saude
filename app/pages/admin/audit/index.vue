<template>
    <div class="audit-page">
        <div class="d-flex align-center mb-4 flex-wrap ga-2">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold d-flex align-center">
                    <v-icon size="28" color="primary" class="mr-2">mdi-shield-search</v-icon>
                    Registro de Auditoria
                </h1>
                <p class="text-body-2 text-grey mb-0">
                    Quem acessou o quê e quando — logins, documentos médicos e
                    mudanças de permissão. Os registros expiram automaticamente
                    após 180 dias.
                </p>
            </div>
            <v-spacer />
            <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loading" @click="load">
                Atualizar
            </v-btn>
        </div>

        <!-- Quick stats -->
        <v-row class="mb-1">
            <v-col cols="6" md="3">
                <v-card variant="tonal" color="primary">
                    <v-card-text class="d-flex align-center ga-3 py-3">
                        <v-icon size="28">mdi-format-list-bulleted</v-icon>
                        <div>
                            <p class="text-h6 font-weight-bold mb-0">{{ entries.length }}</p>
                            <p class="text-caption mb-0">eventos</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="6" md="3">
                <v-card variant="tonal" color="info">
                    <v-card-text class="d-flex align-center ga-3 py-3">
                        <v-icon size="28">mdi-file-eye</v-icon>
                        <div>
                            <p class="text-h6 font-weight-bold mb-0">{{ counts.docAccess }}</p>
                            <p class="text-caption mb-0">acessos a documentos</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="6" md="3">
                <v-card variant="tonal" color="success">
                    <v-card-text class="d-flex align-center ga-3 py-3">
                        <v-icon size="28">mdi-login</v-icon>
                        <div>
                            <p class="text-h6 font-weight-bold mb-0">{{ counts.logins }}</p>
                            <p class="text-caption mb-0">logins com sucesso</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="6" md="3">
                <v-card variant="tonal" :color="counts.failed > 0 ? 'warning' : 'grey'">
                    <v-card-text class="d-flex align-center ga-3 py-3">
                        <v-icon size="28">mdi-alert-circle-outline</v-icon>
                        <div>
                            <p class="text-h6 font-weight-bold mb-0">{{ counts.failed }}</p>
                            <p class="text-caption mb-0">tentativas falhas</p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

        <v-card>
            <v-card-title class="d-flex align-center flex-wrap ga-2 pa-4">
                <v-icon start>mdi-history</v-icon>
                Eventos
                <v-spacer />
                <v-select
                    v-model="actionFilter"
                    :items="actionOptions"
                    item-title="label"
                    item-value="value"
                    label="Filtrar por ação"
                    density="compact"
                    hide-details
                    style="max-width: 260px"
                    @update:model-value="load"
                />
            </v-card-title>
            <v-divider />

            <div v-if="loading && entries.length === 0" class="text-center py-10">
                <v-progress-circular indeterminate color="primary" size="56" />
            </div>

            <v-card-text v-else-if="entries.length === 0">
                <p class="text-grey text-center py-6 mb-0">
                    Nenhum evento registrado ainda.
                </p>
            </v-card-text>

            <v-table v-else density="comfortable" class="audit-table">
                <thead>
                    <tr>
                        <th style="width: 160px">Quando</th>
                        <th style="width: 210px">Ação</th>
                        <th>Usuário</th>
                        <th>Detalhes</th>
                        <th style="width: 130px">IP</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="e in entries" :key="e.id">
                        <td class="text-caption text-no-wrap">{{ formatWhen(e.at) }}</td>
                        <td>
                            <v-chip
                                size="x-small"
                                variant="tonal"
                                :color="actionColor(e.action)"
                                class="font-weight-medium"
                            >
                                <v-icon start size="12">{{ actionIcon(e.action) }}</v-icon>
                                {{ actionLabel(e.action) }}
                            </v-chip>
                        </td>
                        <td class="text-caption">
                            {{ e.email || "—" }}
                            <span v-if="e.role" class="text-grey"> ({{ e.role }})</span>
                        </td>
                        <td class="text-caption text-medium-emphasis">
                            {{ describe(e) }}
                        </td>
                        <td class="text-caption text-grey">{{ e.ip || "—" }}</td>
                    </tr>
                </tbody>
            </v-table>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuthStore } from "~/stores/auth.store";

definePageMeta({ requiresPermission: "users.manage" });

interface AuditEntry {
    id: string;
    at: string;
    action: string;
    email: string | null;
    role: string | null;
    ip: string | null;
    details: Record<string, unknown>;
}

const authStore = useAuthStore();

const entries = ref<AuditEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const actionFilter = ref<string>("");

const actionOptions = [
    { value: "", label: "Todas as ações" },
    { value: "auth.login.success", label: "Login com sucesso" },
    { value: "auth.login.failed", label: "Login falhou" },
    { value: "auth.login.locked", label: "Conta bloqueada" },
    { value: "auth.passwordChanged", label: "Senha alterada" },
    { value: "auth.logoutAll", label: "Sessões encerradas" },
    { value: "exam.view", label: "Documento visualizado" },
    { value: "exam.download", label: "Documento baixado" },
    { value: "exam.upload", label: "Documento enviado" },
    { value: "exam.delete", label: "Documento excluído" },
    { value: "admin.roleChanged", label: "Papel alterado" },
    { value: "admin.privacyChanged", label: "Privacidade alterada" },
];

const LABELS: Record<string, string> = Object.fromEntries(
    actionOptions.filter((o) => o.value).map((o) => [o.value, o.label]),
);

function actionLabel(a: string): string {
    return LABELS[a] || a;
}
function actionColor(a: string): string {
    if (a.startsWith("exam.")) return a === "exam.delete" ? "error" : "info";
    if (a === "auth.login.success") return "success";
    if (a === "auth.login.failed" || a === "auth.login.locked") return "warning";
    if (a.startsWith("admin.")) return "purple";
    return "primary";
}
function actionIcon(a: string): string {
    const map: Record<string, string> = {
        "auth.login.success": "mdi-login",
        "auth.login.failed": "mdi-alert",
        "auth.login.locked": "mdi-lock",
        "auth.passwordChanged": "mdi-key-change",
        "auth.logoutAll": "mdi-logout",
        "exam.view": "mdi-eye",
        "exam.download": "mdi-download",
        "exam.upload": "mdi-upload",
        "exam.update": "mdi-pencil",
        "exam.delete": "mdi-delete",
        "admin.roleChanged": "mdi-account-cog",
        "admin.privacyChanged": "mdi-shield-lock",
    };
    return map[a] || "mdi-circle-small";
}

function describe(e: AuditEntry): string {
    const d = e.details || {};
    if (e.action.startsWith("exam.")) {
        const parts = [];
        if (d.title) parts.push(String(d.title));
        if (d.audience) parts.push(`para: ${(d.audience as string[]).join(", ")}`);
        if (d.size) parts.push(`${Math.round(Number(d.size) / 1024)} KB`);
        return parts.join(" · ") || "—";
    }
    if (e.action === "admin.roleChanged") {
        return `${d.from ?? "?"} → ${d.to}${d.specialty ? "/" + d.specialty : ""}`;
    }
    if (e.action === "admin.privacyChanged") {
        return d.hideWeight ? "peso ocultado" : "peso visível";
    }
    if (e.action === "auth.login.failed") {
        return `${d.reason ?? ""}${d.attempt ? ` (tentativa ${d.attempt})` : ""}${d.locked ? " — conta bloqueada" : ""}`;
    }
    if (e.action === "auth.login.locked") {
        return `bloqueada por mais ${Math.ceil(Number(d.retryAfterSeconds || 0) / 60)} min`;
    }
    return "—";
}

function formatWhen(iso: string): string {
    try {
        return format(parseISO(iso), "dd/MM/yy HH:mm:ss", { locale: ptBR });
    } catch {
        return iso;
    }
}

const counts = computed(() => ({
    docAccess: entries.value.filter((e) => e.action === "exam.view" || e.action === "exam.download").length,
    logins: entries.value.filter((e) => e.action === "auth.login.success").length,
    failed: entries.value.filter((e) => e.action.startsWith("auth.login.f") || e.action === "auth.login.locked").length,
}));

async function load() {
    loading.value = true;
    error.value = null;
    try {
        entries.value = await $fetch<AuditEntry[]>("/api/admin/audit", {
            query: actionFilter.value ? { action: actionFilter.value } : {},
            headers: authStore.authHeaders,
        });
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        error.value = err?.data?.message || err?.message || "Erro ao carregar auditoria";
    } finally {
        loading.value = false;
    }
}

onMounted(load);
</script>

<style scoped>
.audit-page {
    width: 100%;
}
.audit-table {
    max-height: 62vh;
    overflow-y: auto;
}
</style>
