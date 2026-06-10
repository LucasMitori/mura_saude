<template>
    <div class="admin-users">
        <div class="d-flex align-center mb-4 flex-wrap ga-2">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold gradient-text d-flex align-center">
                    <v-icon size="30" color="primary" class="mr-2">mdi-account-group</v-icon>
                    Usuários
                </h1>
                <p class="text-body-2 text-grey">
                    Gerencie os papéis (roles) e especialidades dos usuários
                </p>
            </div>
            <v-spacer />
            <v-btn icon="mdi-arrow-left" variant="tonal" @click="$router.back()" />
        </div>

        <v-alert
            type="info"
            variant="tonal"
            density="comfortable"
            class="mb-4"
            icon="mdi-shield-lock-outline"
        >
            Apenas o <strong>admin</strong> pode alterar papéis. As permissões de
            cada papel são fixas e definidas no sistema.
        </v-alert>

        <div v-if="loading" class="text-center py-10">
            <v-progress-circular indeterminate color="primary" size="56" />
        </div>

        <v-card v-else>
            <v-data-table
                :headers="headers"
                :items="users"
                :items-per-page="25"
                density="comfortable"
            >
                <template #[`item.name`]="{ item }">
                    <div class="d-flex align-center py-1">
                        <v-avatar size="32" color="surface-bright" class="mr-2">
                            <v-img v-if="item.avatar" :src="item.avatar" cover />
                            <v-icon v-else size="18">mdi-account</v-icon>
                        </v-avatar>
                        <div>
                            <div class="font-weight-medium">{{ item.name }}</div>
                            <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
                        </div>
                    </div>
                </template>
                <template #[`item.role`]="{ item }">
                    <v-chip :color="roleColor(item.role)" size="small" variant="tonal">
                        {{ roleLabel(item) }}
                    </v-chip>
                </template>
                <template #[`item.actions`]="{ item }">
                    <v-btn
                        v-if="item.id !== authStore.user?.id"
                        size="small"
                        variant="text"
                        prepend-icon="mdi-account-cog"
                        @click="openEdit(item)"
                    >
                        Alterar papel
                    </v-btn>
                    <v-chip v-else size="x-small" color="grey" variant="tonal">Você</v-chip>
                </template>
            </v-data-table>
        </v-card>

        <!-- Change role dialog -->
        <v-dialog v-model="showEdit" max-width="480">
            <v-card v-if="editing">
                <v-card-title class="pa-4">
                    <v-icon start color="primary">mdi-account-cog</v-icon>
                    Alterar papel
                </v-card-title>
                <v-card-subtitle class="pb-0">{{ editing.name }}</v-card-subtitle>
                <v-card-text class="pt-4">
                    <v-select
                        v-model="form.role"
                        :items="roleOptions"
                        item-title="label"
                        item-value="value"
                        label="Papel"
                        variant="outlined"
                        density="comfortable"
                        class="mb-2"
                    />
                    <v-expand-transition>
                        <v-select
                            v-if="form.role === 'manager'"
                            v-model="form.specialty"
                            :items="specialtyOptions"
                            item-title="label"
                            item-value="value"
                            label="Especialidade"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                        />
                    </v-expand-transition>
                    <p class="text-caption text-medium-emphasis mt-3">
                        {{ roleDescription(form.role, form.specialty) }}
                    </p>
                </v-card-text>
                <v-card-actions class="pa-4">
                    <v-spacer />
                    <v-btn variant="text" @click="showEdit = false">Cancelar</v-btn>
                    <v-btn
                        color="primary"
                        variant="elevated"
                        :loading="saving"
                        :disabled="form.role === 'manager' && !form.specialty"
                        @click="save"
                    >
                        Salvar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { $fetch } from "ofetch";
import type { UserProfile, UserRole, ManagerSpecialty } from "#shared/types/auth";
import { useAuthStore } from "~/stores/auth.store";

definePageMeta({ requiresPermission: "users.manage" });

const authStore = useAuthStore();
const { success, error: notifyError } = useSnackbar();

const users = ref<UserProfile[]>([]);
const loading = ref(true);
const saving = ref(false);
const showEdit = ref(false);
const editing = ref<UserProfile | null>(null);
const form = ref<{ role: UserRole; specialty: ManagerSpecialty | null }>({
    role: "user",
    specialty: null,
});

const headers = [
    { title: "Usuário", key: "name" },
    { title: "Papel", key: "role" },
    { title: "", key: "actions", align: "end" as const, sortable: false },
];

const roleOptions = [
    { value: "user", label: "Usuário (somente leitura)" },
    { value: "manager", label: "Manager (profissional)" },
    { value: "admin", label: "Admin (acesso total)" },
];
const specialtyOptions = [
    { value: "personal_trainer", label: "Personal Trainer" },
    { value: "nutritionist", label: "Nutricionista" },
];

function roleLabel(u: { role: UserRole; specialty?: ManagerSpecialty | null }): string {
    if (u.role === "admin") return "Admin";
    if (u.role === "manager") {
        if (u.specialty === "personal_trainer") return "Personal Trainer";
        if (u.specialty === "nutritionist") return "Nutricionista";
        return "Manager";
    }
    return "Usuário";
}
function roleColor(role: UserRole): string {
    if (role === "admin") return "warning";
    if (role === "manager") return "primary";
    return "info";
}
function roleDescription(role: UserRole, specialty: ManagerSpecialty | null): string {
    if (role === "admin") return "Acesso total a todas as páginas e ações.";
    if (role === "manager") {
        if (specialty === "personal_trainer")
            return "Pode criar, editar e arquivar treinos; vê relatórios e dados (somente leitura).";
        if (specialty === "nutritionist")
            return "Pode editar dados de saúde/alimentação; vê treinos e relatórios (somente leitura).";
        return "Selecione a especialidade.";
    }
    return "Somente leitura — vê o conteúdo mas não pode alterar nada.";
}

async function load() {
    loading.value = true;
    try {
        users.value = await $fetch<UserProfile[]>("/api/admin/users", {
            headers: authStore.authHeaders,
        });
    } catch (e) {
        notifyError(getErr(e));
    } finally {
        loading.value = false;
    }
}

function openEdit(u: UserProfile) {
    editing.value = u;
    form.value = {
        role: u.role,
        specialty: u.specialty ?? (u.role === "manager" ? "personal_trainer" : null),
    };
    showEdit.value = true;
}

async function save() {
    if (!editing.value) return;
    saving.value = true;
    try {
        await $fetch(`/api/admin/users/${editing.value.id}`, {
            method: "PUT",
            body: {
                role: form.value.role,
                specialty: form.value.role === "manager" ? form.value.specialty : null,
            },
            headers: authStore.authHeaders,
        });
        success("Papel atualizado");
        showEdit.value = false;
        await load();
    } catch (e) {
        notifyError(getErr(e));
    } finally {
        saving.value = false;
    }
}

function getErr(e: unknown): string {
    const err = e as { data?: { message?: string }; message?: string };
    return err?.data?.message || err?.message || "Erro inesperado";
}

onMounted(load);
</script>

<style scoped>
.admin-users {
    width: 100%;
    margin: 0 auto;
}
.gradient-text {
    background: linear-gradient(135deg, #4caf50, #03dac6);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
</style>
