<script setup lang="ts">
import { useAuthStore } from "~/stores/auth.store";

definePageMeta({
    layout: false,
});

const authStore = useAuthStore();

// ===== State =====
const isRegistering = ref(false);
const showLoginPassword = ref(false);
const showRegisterPassword = ref(false);
const showConfirmPassword = ref(false);
const registerError = ref<string | null>(null);

const loginFormRef = ref();
const registerFormRef = ref();

const loginForm = ref({
    email: "",
    password: "",
});

const registerForm = ref({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
});

// ===== Validation Rules =====
const rules = {
    required: (v: string) => !!v || "This field is required",
    email: (v: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Invalid email",
    minLength: (min: number) => (v: string) =>
        v.length >= min || `Must be at least ${min} characters`,
    strongPassword: (v: string) => {
        if (v.length < 8) return "At least 8 characters";
        if (!/[A-Z]/.test(v)) return "Must contain an uppercase letter";
        if (!/[a-z]/.test(v)) return "Must contain a lowercase letter";
        if (!/[0-9]/.test(v)) return "Must contain a number";
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v))
            return "Must contain a special character";
        return true;
    },
    passwordMatch: (v: string) =>
        v === registerForm.value.password || "Passwords do not match",
};

// ===== Password Strength =====
const passwordRequirements = computed(() => {
    const p = registerForm.value.password;
    return [
        { label: "At least 8 characters", met: p.length >= 8 },
        { label: "Uppercase letter (A-Z)", met: /[A-Z]/.test(p) },
        { label: "Lowercase letter (a-z)", met: /[a-z]/.test(p) },
        { label: "Number (0-9)", met: /[0-9]/.test(p) },
        {
            label: "Special character (!@#$...)",
            met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
        },
    ];
});

const passwordStrength = computed(() => {
    const metCount = passwordRequirements.value.filter((r) => r.met).length;
    const percentage = (metCount / 5) * 100;

    if (metCount <= 1)
        return {
            percentage,
            color: "error",
            label: "Weak",
            colorClass: "text-error",
        };
    if (metCount <= 2)
        return {
            percentage,
            color: "warning",
            label: "Fair",
            colorClass: "text-warning",
        };
    if (metCount <= 3)
        return {
            percentage,
            color: "info",
            label: "Good",
            colorClass: "text-info",
        };
    if (metCount <= 4)
        return {
            percentage,
            color: "light-green",
            label: "Strong",
            colorClass: "text-light-green",
        };
    return {
        percentage,
        color: "success",
        label: "Excellent",
        colorClass: "text-success",
    };
});

// ===== Flip Animation =====
function flipToRegister() {
    authStore.error = null;
    registerError.value = null;
    isRegistering.value = true;
}

function flipToLogin() {
    authStore.error = null;
    registerError.value = null;
    isRegistering.value = false;
}

// ===== Handlers =====
async function handleLogin() {
    const { valid } = await loginFormRef.value.validate();
    if (!valid) return;

    try {
        await authStore.login(loginForm.value.email, loginForm.value.password);
        await navigateTo("/");
    } catch {
        // Error is displayed via authStore.error
    }
}

async function handleRegister() {
    const { valid } = await registerFormRef.value.validate();
    if (!valid) return;

    registerError.value = null;

    if (registerForm.value.password !== registerForm.value.confirmPassword) {
        registerError.value = "Passwords do not match";
        return;
    }

    try {
        await authStore.register(
            registerForm.value.name,
            registerForm.value.email,
            registerForm.value.password,
        );
        await navigateTo("/");
    } catch (e: unknown) {
        registerError.value = authStore.error;
    }
}
</script>

<template>
    <v-container
        class="fill-height d-flex align-center justify-center"
        style="height: 100vh"
        fluid
    >
        <div class="flip-container" :class="{ flipped: isRegistering }">
            <!-- ===== FRONT: LOGIN ===== -->
            <div class="flip-front">
                <v-card
                    width="420"
                    style="border-radius: 20px; padding: 20px"
                    elevation="12"
                >
                    <v-card-title
                        class="text-center text-h4 font-weight-bold py-4"
                    >
                        <v-icon size="40" color="primary" class="mr-2">
                            mdi-heart-pulse
                        </v-icon>
                        Mura Saúde
                    </v-card-title>

                    <v-card-subtitle class="text-center text-body-1 pb-4">
                        Sign in to your account
                    </v-card-subtitle>

                    <v-card-text>
                        <v-form
                            ref="loginFormRef"
                            @submit.prevent="handleLogin"
                        >
                            <v-text-field
                                v-model="loginForm.email"
                                label="Email"
                                type="email"
                                prepend-inner-icon="mdi-email-outline"
                                variant="outlined"
                                :rules="[rules.required, rules.email]"
                                class="mb-2"
                            />

                            <v-text-field
                                v-model="loginForm.password"
                                :type="showLoginPassword ? 'text' : 'password'"
                                label="Password"
                                prepend-inner-icon="mdi-lock-outline"
                                :append-inner-icon="
                                    showLoginPassword
                                        ? 'mdi-eye-off'
                                        : 'mdi-eye'
                                "
                                variant="outlined"
                                :rules="[rules.required]"
                                @click:append-inner="
                                    showLoginPassword = !showLoginPassword
                                "
                                class="mb-2"
                            />

                            <v-alert
                                v-if="authStore.error"
                                type="error"
                                variant="tonal"
                                density="compact"
                                closable
                                class="mb-4"
                            >
                                {{ authStore.error }}
                            </v-alert>

                            <v-btn
                                type="submit"
                                color="primary"
                                block
                                size="large"
                                :loading="authStore.loading"
                                class="mb-4"
                            >
                                Sign In
                            </v-btn>
                        </v-form>
                    </v-card-text>

                    <v-divider />

                    <v-card-actions class="justify-center pa-4">
                        <span class="text-body-2 text-grey">
                            Don't have an account?
                        </span>
                        <v-btn
                            variant="text"
                            color="primary"
                            @click="flipToRegister"
                        >
                            Create Account
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </div>

            <!-- ===== BACK: REGISTER ===== -->
            <div class="flip-back">
                <v-card
                    width="420"
                    style="border-radius: 20px; padding: 20px"
                    elevation="12"
                >
                    <v-card-title
                        class="text-center text-h4 font-weight-bold py-4"
                    >
                        <v-icon size="40" color="secondary" class="mr-2">
                            mdi-account-plus
                        </v-icon>
                        Register
                    </v-card-title>

                    <v-card-subtitle class="text-center text-body-1 pb-4">
                        Create your account
                    </v-card-subtitle>

                    <v-card-text>
                        <v-form
                            ref="registerFormRef"
                            @submit.prevent="handleRegister"
                        >
                            <v-text-field
                                v-model="registerForm.name"
                                label="Full Name"
                                prepend-inner-icon="mdi-account-outline"
                                variant="outlined"
                                :rules="[rules.required, rules.minLength(3)]"
                                class="mb-2"
                            />

                            <v-text-field
                                v-model="registerForm.email"
                                label="Email"
                                type="email"
                                prepend-inner-icon="mdi-email-outline"
                                variant="outlined"
                                :rules="[rules.required, rules.email]"
                                class="mb-2"
                            />

                            <v-text-field
                                v-model="registerForm.password"
                                :type="
                                    showRegisterPassword ? 'text' : 'password'
                                "
                                label="Password"
                                prepend-inner-icon="mdi-lock-outline"
                                :append-inner-icon="
                                    showRegisterPassword
                                        ? 'mdi-eye-off'
                                        : 'mdi-eye'
                                "
                                variant="outlined"
                                :rules="[rules.required, rules.strongPassword]"
                                @click:append-inner="
                                    showRegisterPassword = !showRegisterPassword
                                "
                                class="mb-2"
                            />

                            <v-text-field
                                v-model="registerForm.confirmPassword"
                                :type="
                                    showConfirmPassword ? 'text' : 'password'
                                "
                                label="Confirm Password"
                                prepend-inner-icon="mdi-lock-check-outline"
                                :append-inner-icon="
                                    showConfirmPassword
                                        ? 'mdi-eye-off'
                                        : 'mdi-eye'
                                "
                                variant="outlined"
                                :rules="[rules.required, rules.passwordMatch]"
                                @click:append-inner="
                                    showConfirmPassword = !showConfirmPassword
                                "
                                class="mb-2"
                            />

                            <!-- Password strength indicator -->
                            <v-expand-transition>
                                <div
                                    v-if="registerForm.password.length > 0"
                                    class="mb-4"
                                >
                                    <div
                                        class="d-flex justify-space-between mb-1"
                                    >
                                        <span class="text-caption"
                                            >Password Strength</span
                                        >
                                        <span
                                            class="text-caption"
                                            :class="passwordStrength.colorClass"
                                        >
                                            {{ passwordStrength.label }}
                                        </span>
                                    </div>
                                    <v-progress-linear
                                        :model-value="
                                            passwordStrength.percentage
                                        "
                                        :color="passwordStrength.color"
                                        height="6"
                                        rounded
                                    />
                                    <div class="mt-2">
                                        <div
                                            v-for="req in passwordRequirements"
                                            :key="req.label"
                                            class="d-flex align-center"
                                        >
                                            <v-icon
                                                :icon="
                                                    req.met
                                                        ? 'mdi-check-circle'
                                                        : 'mdi-circle-outline'
                                                "
                                                :color="
                                                    req.met ? 'success' : 'grey'
                                                "
                                                size="16"
                                                class="mr-1"
                                            />
                                            <span
                                                class="text-caption"
                                                :class="
                                                    req.met
                                                        ? 'text-success'
                                                        : 'text-grey'
                                                "
                                            >
                                                {{ req.label }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </v-expand-transition>

                            <v-alert
                                v-if="registerError"
                                type="error"
                                variant="tonal"
                                density="compact"
                                closable
                                class="mb-4"
                            >
                                {{ registerError }}
                            </v-alert>

                            <v-btn
                                type="submit"
                                color="secondary"
                                block
                                size="large"
                                :loading="authStore.loading"
                                class="mb-4"
                            >
                                Create Account
                            </v-btn>
                        </v-form>
                    </v-card-text>

                    <v-divider />

                    <v-card-actions class="justify-center pa-4">
                        <span class="text-body-2 text-grey">
                            Already have an account?
                        </span>
                        <v-btn
                            variant="text"
                            color="primary"
                            @click="flipToLogin"
                        >
                            Sign In
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </div>
        </div>
    </v-container>
</template>

<style scoped>
.flip-container {
    perspective: 1200px;
    width: 420px;
    min-height: 500px;
    position: relative;
}

.flip-front,
.flip-back {
    position: absolute;
    width: 100%;
    backface-visibility: hidden;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform-style: preserve-3d;
}

.flip-front {
    transform: rotateY(0deg);
}

.flip-back {
    transform: rotateY(180deg);
}

.flip-container.flipped .flip-front {
    transform: rotateY(-180deg);
}

.flip-container.flipped .flip-back {
    transform: rotateY(0deg);
}
</style>
