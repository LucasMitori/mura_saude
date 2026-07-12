<template>
    <div class="profile-page">
        <div class="d-flex align-center mb-4">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold gradient-text">
                    Perfil
                </h1>
                <p class="text-body-2 text-grey">
                    Configure sua conta e personalize seu avatar
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
            <!-- Left column: avatar -->
            <v-col cols="12" md="4">
                <v-card class="mb-3">
                    <v-card-title class="d-flex align-center">
                        <v-icon start>mdi-image-edit</v-icon>
                        Avatar
                    </v-card-title>
                    <v-divider />
                    <v-card-text class="text-center pt-6">
                        <v-avatar
                            :color="avatarBgColor"
                            variant="flat"
                            size="140"
                            class="profile-avatar mb-4"
                        >
                            <v-img
                                v-if="previewAvatar"
                                :src="previewAvatar"
                                cover
                            />
                            <v-icon
                                v-else
                                size="80"
                                color="white"
                            >
                                mdi-account
                            </v-icon>
                        </v-avatar>

                        <v-file-input
                            v-model="avatarFile"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            label="Escolher imagem do PC"
                            prepend-icon=""
                            prepend-inner-icon="mdi-camera"
                            variant="outlined"
                            density="comfortable"
                            show-size
                            class="mt-2"
                            @update:model-value="onAvatarSelected"
                        />

                        <p class="text-caption text-grey mt-1">
                            PNG, JPG, WebP ou GIF — até 5&nbsp;MB
                        </p>

                        <div class="d-flex align-center mt-3">
                            <v-btn
                                v-if="form.avatar"
                                color="error"
                                variant="tonal"
                                size="small"
                                prepend-icon="mdi-delete"
                                @click="removeAvatar"
                            >
                                Remover
                            </v-btn>
                            <v-spacer />
                            <v-btn
                                color="primary"
                                size="small"
                                prepend-icon="mdi-content-save"
                                :loading="loading.avatar"
                                :disabled="!avatarChanged"
                                @click="saveAvatar"
                            >
                                Salvar Avatar
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>

                <v-card>
                    <v-card-title class="d-flex align-center">
                        <v-icon start>mdi-information</v-icon>
                        Conta
                    </v-card-title>
                    <v-divider />
                    <v-list density="comfortable">
                        <v-list-item
                            :title="authStore.user?.email"
                            subtitle="Email"
                            prepend-icon="mdi-email"
                        />
                        <v-list-item
                            :title="authStore.user?.role === 'admin' ? 'Administrador' : 'Visualizador'"
                            subtitle="Função"
                            :prepend-icon="authStore.user?.role === 'admin' ? 'mdi-shield-crown' : 'mdi-eye'"
                        />
                        <v-list-item
                            :title="formattedCreatedAt"
                            subtitle="Membro desde"
                            prepend-icon="mdi-calendar-account"
                        />
                    </v-list>
                </v-card>
            </v-col>

            <!-- Right column: profile fields + password -->
            <v-col cols="12" md="8">
                <v-card class="mb-3">
                    <v-card-title class="d-flex align-center">
                        <v-icon start>mdi-account-edit</v-icon>
                        Informações Pessoais
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                        <v-text-field
                            v-model="form.name"
                            label="Nome"
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-account"
                            :rules="[(v: string) => !!v?.trim() || 'Nome obrigatório', (v: string) => (v?.trim().length ?? 0) >= 2 || 'Mínimo 2 caracteres']"
                        />
                        <v-text-field
                            :model-value="authStore.user?.email"
                            label="Email"
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-email"
                            readonly
                            hint="O email não pode ser alterado"
                            persistent-hint
                        />
                    </v-card-text>
                    <v-divider />
                    <v-card-actions class="px-4 py-3">
                        <v-spacer />
                        <v-btn
                            color="primary"
                            variant="elevated"
                            prepend-icon="mdi-content-save"
                            :loading="loading.name"
                            :disabled="!nameChanged || !form.name?.trim()"
                            @click="saveName"
                        >
                            Salvar Nome
                        </v-btn>
                    </v-card-actions>
                </v-card>

                <v-card>
                    <v-card-title class="d-flex align-center">
                        <v-icon start>mdi-lock-reset</v-icon>
                        Alterar Senha
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                        <v-text-field
                            v-model="form.currentPassword"
                            :type="showCurrent ? 'text' : 'password'"
                            label="Senha atual"
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-lock-outline"
                            :append-inner-icon="showCurrent ? 'mdi-eye-off' : 'mdi-eye'"
                            @click:append-inner="showCurrent = !showCurrent"
                        />
                        <v-text-field
                            v-model="form.newPassword"
                            :type="showNew ? 'text' : 'password'"
                            label="Nova senha"
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-lock"
                            :append-inner-icon="showNew ? 'mdi-eye-off' : 'mdi-eye'"
                            @click:append-inner="showNew = !showNew"
                        />

                        <v-expand-transition>
                            <div v-if="form.newPassword.length > 0" class="mb-2">
                                <div class="d-flex justify-space-between mb-1">
                                    <span class="text-caption">Força da senha</span>
                                    <span class="text-caption" :class="strength.colorClass">
                                        {{ strength.label }}
                                    </span>
                                </div>
                                <v-progress-linear
                                    :model-value="strength.percentage"
                                    :color="strength.color"
                                    height="6"
                                    rounded
                                />
                                <div class="mt-2">
                                    <div
                                        v-for="req in requirements"
                                        :key="req.label"
                                        class="d-flex align-center"
                                    >
                                        <v-icon
                                            :icon="req.met ? 'mdi-check-circle' : 'mdi-circle-outline'"
                                            :color="req.met ? 'success' : 'grey'"
                                            size="16"
                                            class="mr-1"
                                        />
                                        <span
                                            class="text-caption"
                                            :class="req.met ? 'text-success' : 'text-grey'"
                                        >
                                            {{ req.label }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </v-expand-transition>

                        <v-text-field
                            v-model="form.confirmPassword"
                            :type="showConfirm ? 'text' : 'password'"
                            label="Confirmar nova senha"
                            variant="outlined"
                            density="comfortable"
                            prepend-inner-icon="mdi-lock-check"
                            :append-inner-icon="showConfirm ? 'mdi-eye-off' : 'mdi-eye'"
                            :error-messages="passwordMismatchError"
                            @click:append-inner="showConfirm = !showConfirm"
                        />
                    </v-card-text>
                    <v-divider />
                    <v-card-actions class="px-4 py-3">
                        <v-spacer />
                        <v-btn
                            color="primary"
                            variant="elevated"
                            prepend-icon="mdi-key-change"
                            :loading="loading.password"
                            :disabled="!canSavePassword"
                            @click="savePassword"
                        >
                            Alterar Senha
                        </v-btn>
                    </v-card-actions>
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
import { ref, computed, watch, onMounted } from "vue";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuthStore } from "~/stores/auth.store";

const authStore = useAuthStore();

const form = ref({
    name: authStore.user?.name || "",
    avatar: authStore.user?.avatar || null as string | null,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
});

const initialName = ref(authStore.user?.name || "");
const initialAvatar = ref<string | null>(authStore.user?.avatar || null);

const avatarFile = ref<File[] | File | null>(null);
const previewAvatar = ref<string | null>(form.value.avatar);

const showCurrent = ref(false);
const showNew = ref(false);
const showConfirm = ref(false);

const loading = ref({ name: false, avatar: false, password: false });
const snackbar = ref({ show: false, message: "", color: "success" });

function notify(message: string, color: "success" | "error" | "info" = "success") {
    snackbar.value = { show: true, message, color };
}

onMounted(async () => {
    if (authStore.token) {
        try {
            await authStore.fetchProfile();
            form.value.name = authStore.user?.name || "";
            form.value.avatar = authStore.user?.avatar || null;
            initialName.value = form.value.name;
            initialAvatar.value = form.value.avatar;
            previewAvatar.value = form.value.avatar;
        } catch {
            // already handled in store
        }
    }
});

const avatarBgColor = computed(() => {
    return authStore.isAdmin ? "amber-darken-2" : "primary";
});

const avatarChanged = computed(() => form.value.avatar !== initialAvatar.value);
const nameChanged = computed(() => form.value.name.trim() !== initialName.value);

const formattedCreatedAt = computed(() => {
    const raw = authStore.user?.createdAt;
    if (!raw) return "—";
    try {
        return format(parseISO(raw), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
        return raw;
    }
});

const requirements = computed(() => {
    const p = form.value.newPassword;
    return [
        { label: "Pelo menos 8 caracteres", met: p.length >= 8 },
        { label: "Uma letra maiúscula", met: /[A-Z]/.test(p) },
        { label: "Uma letra minúscula", met: /[a-z]/.test(p) },
        { label: "Um número", met: /[0-9]/.test(p) },
        { label: "Um caractere especial", met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
    ];
});

const strength = computed(() => {
    const m = requirements.value.filter((r) => r.met).length;
    const pct = (m / 5) * 100;
    if (m <= 1) return { percentage: pct, color: "error", label: "Fraca", colorClass: "text-error" };
    if (m <= 2) return { percentage: pct, color: "warning", label: "Regular", colorClass: "text-warning" };
    if (m <= 3) return { percentage: pct, color: "info", label: "Boa", colorClass: "text-info" };
    if (m <= 4) return { percentage: pct, color: "light-green", label: "Forte", colorClass: "text-light-green" };
    return { percentage: pct, color: "success", label: "Excelente", colorClass: "text-success" };
});

const passwordMismatchError = computed(() => {
    if (form.value.confirmPassword && form.value.newPassword !== form.value.confirmPassword) {
        return "As senhas não coincidem";
    }
    return undefined;
});

const canSavePassword = computed(() => {
    return (
        form.value.currentPassword.length > 0 &&
        form.value.newPassword.length > 0 &&
        form.value.newPassword === form.value.confirmPassword &&
        requirements.value.every((r) => r.met)
    );
});

function onAvatarSelected(value: unknown) {
    const file = Array.isArray(value) ? value[0] : value;
    if (!(file instanceof File)) return;
    if (file.size > 5 * 1024 * 1024) {
        notify("Imagem muito grande (máx 5 MB). Reduza e tente de novo.", "error");
        avatarFile.value = null;
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result as string;
        form.value.avatar = result;
        previewAvatar.value = result;
    };
    reader.readAsDataURL(file);
}

function removeAvatar() {
    form.value.avatar = null;
    previewAvatar.value = null;
    avatarFile.value = null;
}

async function saveAvatar() {
    loading.value.avatar = true;
    try {
        await authStore.updateProfile({ avatar: form.value.avatar });
        initialAvatar.value = form.value.avatar;
        notify("Avatar atualizado");
    } catch (e) {
        notify(getErr(e), "error");
    } finally {
        loading.value.avatar = false;
    }
}

async function saveName() {
    loading.value.name = true;
    try {
        await authStore.updateProfile({ name: form.value.name.trim() });
        initialName.value = form.value.name.trim();
        notify("Nome atualizado");
    } catch (e) {
        notify(getErr(e), "error");
    } finally {
        loading.value.name = false;
    }
}

async function savePassword() {
    loading.value.password = true;
    try {
        await authStore.updateProfile({
            currentPassword: form.value.currentPassword,
            newPassword: form.value.newPassword,
        });
        form.value.currentPassword = "";
        form.value.newPassword = "";
        form.value.confirmPassword = "";
        notify("Senha alterada");
    } catch (e) {
        notify(getErr(e), "error");
    } finally {
        loading.value.password = false;
    }
}

function getErr(e: unknown): string {
    const err = e as { data?: { message?: string }; message?: string };
    return err?.data?.message || err?.message || "Erro inesperado";
}

watch(
    () => authStore.user,
    (u) => {
        if (u) {
            form.value.name = u.name || "";
            form.value.avatar = u.avatar || null;
            previewAvatar.value = u.avatar || null;
        }
    },
);
</script>

<style scoped>
.profile-page {
    width: 100%;
    margin: 0 auto;
}
.gradient-text {
    background: linear-gradient(135deg, #4caf50, #03dac6);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.profile-avatar {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    border: 2px solid rgba(255, 255, 255, 0.08);
}
</style>
