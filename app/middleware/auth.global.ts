import { useAuthStore } from "~/stores/auth.store";

export default defineNuxtRouteMiddleware((to) => {
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
