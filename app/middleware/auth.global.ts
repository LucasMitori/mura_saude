import { useAuthStore } from "~/stores/auth.store";

export default defineNuxtRouteMiddleware((to) => {
    // Auth state lives in localStorage — only meaningful on the client.
    // Skipping on the server avoids SSR/CSR hydration mismatches.
    if (import.meta.server) return;

    const authStore = useAuthStore();

    if (!authStore.isAuthenticated) {
        authStore.restoreAuth();
    }

    if (to.path === "/login") {
        if (authStore.isAuthenticated) {
            return navigateTo("/");
        }
        return;
    }

    if (!authStore.isAuthenticated) {
        return navigateTo("/login");
    }
});
