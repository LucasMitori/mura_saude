import type { Permission } from "#shared/types/auth";
import { useAuthStore } from "~/stores/auth.store";

// Page-level permission gate. A page declares the permission(s) it needs via
//   definePageMeta({ requiresPermission: "users.manage" })
// and this middleware redirects callers who lack it. Runs after auth.global
// (alphabetical order). This is a UX guard — the server independently rejects
// any unauthorized API call, so blocking here is not the security boundary.
export default defineNuxtRouteMiddleware((to) => {
    if (import.meta.server) return;

    const required = to.meta.requiresPermission as
        | Permission
        | Permission[]
        | undefined;
    if (!required) return;

    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return; // auth.global already redirects to /login

    const perms = Array.isArray(required) ? required : [required];
    if (!perms.every((p) => authStore.can(p))) {
        return navigateTo("/");
    }
});
