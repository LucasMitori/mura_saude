<template>
    <v-app>
        <v-navigation-drawer v-model="drawer" app>
            <v-list-item
                :title="authStore.user?.name ?? 'User'"
                :subtitle="authStore.user?.email ?? ''"
                class="pa-4"
            >
                <template #prepend>
                    <v-avatar color="primary" size="40">
                        <span class="text-h6">{{ userInitials }}</span>
                    </v-avatar>
                </template>
                <template #append>
                    <v-chip
                        :color="authStore.isAdmin ? 'warning' : 'info'"
                        size="x-small"
                    >
                        {{ authStore.isAdmin ? "Admin" : "Viewer" }}
                    </v-chip>
                </template>
            </v-list-item>

            <v-divider />

            <v-list density="compact" nav>
                <v-list-item
                    prepend-icon="mdi-view-dashboard"
                    title="Dashboard"
                    to="/"
                />
                <v-list-item
                    v-if="authStore.isAdmin"
                    prepend-icon="mdi-calendar-plus"
                    title="Nova Entrada"
                    to="/daily/new"
                />
            </v-list>

            <template #append>
                <div class="pa-4">
                    <v-btn
                        block
                        variant="outlined"
                        color="error"
                        prepend-icon="mdi-logout"
                        @click="handleLogout"
                    >
                        Sair
                    </v-btn>
                </div>
            </template>
        </v-navigation-drawer>

        <v-app-bar app color="primary" density="compact">
            <v-app-bar-nav-icon @click="drawer = !drawer" />
            <v-toolbar-title class="font-weight-bold">
                Mura Saúde
            </v-toolbar-title>
            <v-spacer />
            <v-chip
                v-if="!authStore.isAdmin"
                color="info"
                size="small"
                class="mr-2"
            >
                <v-icon start size="14">mdi-eye</v-icon>
                Modo Visualização
            </v-chip>
            <v-btn icon="mdi-theme-light-dark" @click="toggleTheme" />
        </v-app-bar>

        <v-main>
            <v-container fluid>
                <slot />
            </v-container>
        </v-main>

        <!-- Footer -->
        <v-footer app class="footer-bar pa-0">
            <v-container fluid class="pa-3 d-flex align-center justify-center">
                <span class="text-body-2 text-grey">
                    Desenvolvido e projetado por
                </span>
                <span class="author-name mx-1 font-weight-bold">
                    Lucas Mitori
                </span>
                <span class="text-body-2 text-grey">
                    · © {{ currentYear }}
                </span>
            </v-container>
        </v-footer>
    </v-app>
</template>

<script setup lang="ts">
import { useTheme } from "vuetify";
import { useAuthStore } from "~/stores/auth.store";

const drawer = ref(true);
const theme = useTheme();
const authStore = useAuthStore();
const currentYear = new Date().getFullYear();

const userInitials = computed(() => {
    const name = authStore.user?.name || "U";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
});

function toggleTheme() {
    theme.global.name.value = theme.global.current.value.dark
        ? "light"
        : "dark";
}

async function handleLogout() {
    authStore.logout();
    await navigateTo("/login");
}
</script>

<style scoped>
.footer-bar {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Dark mode: gold name */
.v-theme--dark .author-name {
    color: #ffd700;
}

/* Light mode: black name */
.v-theme--light .author-name {
    color: #000000;
}
</style>
