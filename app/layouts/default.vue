<template>
    <v-app>
        <!-- App-bar FIRST so v-layout reserves the right top space -->
        <v-app-bar
            location="top"
            density="comfortable"
            elevation="0"
            class="app-bar"
            :height="56"
        >
            <v-app-bar-nav-icon @click="drawer = !drawer" />
            <v-toolbar-title class="font-weight-bold pa-0">
                <NuxtLink to="/" class="brand-link">
                    <v-icon color="primary" class="mr-1">mdi-heart-pulse</v-icon>
                    Mura Saúde
                </NuxtLink>
            </v-toolbar-title>
            <v-spacer />

            <div class="app-bar-actions">
                <v-tooltip text="Adicionar refeição" location="bottom">
                    <template #activator="{ props }">
                        <v-btn
                            v-if="authStore.can('nutrition.edit')"
                            v-bind="props"
                            icon
                            variant="text"
                            density="comfortable"
                            to="/meals/quick"
                            class="header-btn"
                        >
                            <v-icon>mdi-plus-circle-outline</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>

                <v-tooltip text="Relatórios" location="bottom">
                    <template #activator="{ props }">
                        <v-btn
                            v-bind="props"
                            icon
                            variant="text"
                            density="comfortable"
                            to="/reports"
                            class="header-btn"
                        >
                            <v-icon>mdi-chart-box-outline</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>

                <v-chip
                    v-if="!canEditAnything"
                    color="info"
                    size="small"
                    variant="tonal"
                    class="header-chip"
                >
                    <v-icon start size="14">mdi-eye</v-icon>
                    Visualização
                </v-chip>

                <v-tooltip
                    :text="isDark ? 'Modo claro' : 'Modo escuro'"
                    location="bottom"
                >
                    <template #activator="{ props }">
                        <v-btn
                            v-bind="props"
                            icon
                            variant="text"
                            density="comfortable"
                            class="header-btn"
                            @click="toggleTheme"
                        >
                            <v-icon>
                                {{
                                    isDark
                                        ? "mdi-weather-night"
                                        : "mdi-weather-sunny"
                                }}
                            </v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
            </div>
        </v-app-bar>

        <v-navigation-drawer
            v-model="drawer"
            :temporary="mobile"
            location="left"
            :width="280"
        >
            <v-list-item
                :title="userDisplayName"
                class="user-card"
                link
                to="/profile"
            >
                <template #prepend>
                    <v-avatar
                        :color="hasAvatar ? undefined : avatarBgColor"
                        variant="flat"
                        size="42"
                        class="sidebar-avatar"
                    >
                        <v-img
                            v-if="hasAvatar"
                            :src="authStore.user!.avatar!"
                            cover
                        />
                        <v-icon
                            v-else
                            color="white"
                            size="26"
                        >
                            mdi-account
                        </v-icon>
                    </v-avatar>
                </template>
                <template #append>
                    <v-chip :color="roleColor" size="x-small">
                        {{ roleLabel }}
                    </v-chip>
                </template>
            </v-list-item>

            <v-divider />

            <v-list density="comfortable" nav>
                <v-list-item
                    prepend-icon="mdi-view-dashboard"
                    title="Dashboard"
                    to="/"
                />
                <v-list-item
                    prepend-icon="mdi-chart-box"
                    title="Relatórios"
                    to="/reports"
                />
                <v-list-item
                    prepend-icon="mdi-dumbbell"
                    title="Treinos"
                    to="/workout"
                />
                <v-list-item
                    v-if="authStore.can('diet.view')"
                    prepend-icon="mdi-food-apple"
                    title="Dietas"
                    to="/diet"
                />
                <v-list-subheader v-if="canEditAnything">
                    Gerenciar
                </v-list-subheader>
                <v-list-item
                    v-if="authStore.can('nutrition.edit')"
                    prepend-icon="mdi-plus-circle"
                    title="Adicionar Refeição"
                    to="/meals/quick"
                />
                <v-list-item
                    v-if="authStore.can('nutrition.edit')"
                    prepend-icon="mdi-calendar-plus"
                    title="Nova Entrada Completa"
                    to="/daily/new"
                />
                <v-list-item
                    v-if="authStore.can('users.manage')"
                    prepend-icon="mdi-account-group"
                    title="Usuários"
                    to="/admin/users"
                />
                <v-list-item
                    v-if="authStore.can('users.manage')"
                    prepend-icon="mdi-image-multiple"
                    title="Galeria de Fotos"
                    to="/admin/gallery"
                />
                <v-list-item
                    v-if="authStore.can('users.manage')"
                    prepend-icon="mdi-cog"
                    title="Configurações"
                    to="/admin/settings"
                />
            </v-list>

            <template #append>
                <div class="pa-3">
                    <v-btn
                        block
                        variant="tonal"
                        color="error"
                        prepend-icon="mdi-logout"
                        size="small"
                        @click="handleLogout"
                    >
                        Sair
                    </v-btn>
                </div>
            </template>
        </v-navigation-drawer>

        <v-main class="main-content">
            <v-container fluid class="px-4 px-md-6 py-3 main-container">
                <slot />
            </v-container>
        </v-main>

        <v-footer class="footer-bar" :height="44">
            <div class="footer-content d-flex align-center justify-center w-100 px-4">
                <span class="text-caption text-medium-emphasis">
                    Desenvolvido e projetado por
                </span>
                <span class="author-name mx-1 font-weight-bold text-caption">
                    Lucas Mitori
                </span>
                <span class="text-caption text-medium-emphasis">
                    · © {{ currentYear }}
                </span>
            </div>
        </v-footer>

        <!-- App-wide toast — driven by useSnackbar() from any page/component -->
        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            :timeout="snackbar.timeout"
            location="bottom right"
        >
            {{ snackbar.message }}
            <template #actions>
                <v-btn
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    @click="snackbar.show = false"
                />
            </template>
        </v-snackbar>
    </v-app>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useTheme, useDisplay } from "vuetify";
import { useAuthStore } from "~/stores/auth.store";

const theme = useTheme();
const { mobile } = useDisplay();
const authStore = useAuthStore();
const currentYear = new Date().getFullYear();

// Drawer: permanent/open on desktop, an overlay (with scrim) only on mobile.
// Binding `:temporary` explicitly prevents Vuetify from rendering a scrim on
// desktop — a default-open `location="left"` drawer on ssr:false pages would
// otherwise leave a full-page scrim stuck in `fade-transition-leave-from`,
// covering the content and footer.
const drawer = ref(!mobile.value);
watch(mobile, (isMobile) => {
    drawer.value = !isMobile;
});

const { state: snackbar } = useSnackbar();

const isDark = computed(() => theme.global.current.value.dark);

const userDisplayName = computed(() => authStore.user?.name || "Usuário");

const hasAvatar = computed(
    () =>
        !!authStore.user?.avatar &&
        typeof authStore.user.avatar === "string" &&
        authStore.user.avatar.startsWith("data:image/"),
);

const avatarBgColor = computed(() =>
    authStore.isAdmin ? "amber-darken-2" : "primary",
);

const roleLabel = computed(() => {
    const u = authStore.user;
    if (!u) return "";
    if (u.role === "admin") return "Admin";
    if (u.role === "manager") {
        if (u.specialty === "personal_trainer") return "Personal Trainer";
        if (u.specialty === "nutritionist") return "Nutricionista";
        return "Manager";
    }
    return "Usuário";
});

const roleColor = computed(() => {
    const r = authStore.user?.role;
    if (r === "admin") return "warning";
    if (r === "manager") return "primary";
    return "info";
});

// Does the user have any editing capability at all? (Pure viewers get a badge.)
const canEditAnything = computed(
    () =>
        authStore.can("nutrition.edit") ||
        authStore.can("treinos.create") ||
        authStore.can("treinos.edit") ||
        authStore.can("diet.edit") ||
        authStore.can("users.manage"),
);

function toggleTheme() {
    theme.change(isDark.value ? "light" : "dark");
}

async function handleLogout() {
    authStore.logout();
    await navigateTo("/login");
}
</script>

<style scoped>
.app-bar {
    backdrop-filter: blur(12px);
    background: rgba(22, 25, 31, 0.78) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-inline: 8px;
}
.v-theme--light .app-bar {
    background: rgba(255, 255, 255, 0.88) !important;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* App-bar action buttons — consistent subtle icon style with spacing */
.app-bar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-inline: 8px;
}
.header-btn {
    color: rgba(232, 236, 239, 0.85) !important;
    border-radius: 10px !important;
    transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease;
}
.header-btn:hover {
    color: rgb(var(--v-theme-primary)) !important;
    background: rgba(76, 175, 80, 0.10) !important;
    transform: translateY(-1px);
}
.v-theme--light .header-btn {
    color: rgba(20, 20, 20, 0.7) !important;
}
.v-theme--light .header-btn:hover {
    background: rgba(76, 175, 80, 0.10) !important;
}
.header-chip {
    margin-inline: 4px;
}

.user-card {
    background: linear-gradient(
        135deg,
        rgba(76, 175, 80, 0.08),
        rgba(3, 218, 198, 0.06)
    );
    cursor: pointer;
    transition: background 0.2s ease;
    /* Scoped (not utility classes) so it survives Vuetify's component CSS
       ordering — breathing room around the avatar, above and below. */
    padding: 20px 16px !important;
}
.user-card:hover {
    background: linear-gradient(
        135deg,
        rgba(76, 175, 80, 0.16),
        rgba(3, 218, 198, 0.12)
    );
}
.user-card :deep(.v-list-item-title) {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.sidebar-avatar {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* v-main already receives padding-top equal to the app-bar height from
   Vuetify's layout system. It must fill the available width — the previous
   `align-self: flex-start` made it shrink-wrap its content, and the
   `.v-main__wrap` rule was a Vuetify 2 leftover that matches nothing in v4. */
/* Single source of truth for content width — every page sits inside this, so the
   left/right edges line up identically when navigating between screens. */
.main-container {
    max-width: 1400px;
    margin-inline: auto;
}

.footer-bar {
    border-top: 1px solid rgba(128, 128, 128, 0.2);
    background: transparent !important;
    /* Never grow/shrink in the app's flex column — keeps it pinned at 44px so it
       can't balloon on any page. */
    flex: 0 0 auto;
}
.footer-content {
    flex-wrap: nowrap;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.brand-link {
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
}

.v-theme--dark .author-name {
    color: #ffd700;
}

.v-theme--light .author-name {
    color: #000000;
}
</style>
