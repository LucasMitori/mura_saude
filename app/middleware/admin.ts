import { useAuthStore } from "~/stores/auth.store";

export default defineNuxtRouteMiddleware((to) => {
    const authStore = useAuthStore();

    if (to.path === "/daily/new" && !authStore.isAdmin) {
        return navigateTo("/");
    }
});
