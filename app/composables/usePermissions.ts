import { computed } from "vue";
import type { Permission } from "#shared/types/auth";
import { useAuthStore } from "~/stores/auth.store";

// Convenience wrapper around the auth store's permission state. UX only — the
// real authorization happens server-side on every request.
export function usePermissions() {
    const authStore = useAuthStore();

    function can(perm: Permission): boolean {
        return authStore.can(perm);
    }

    const permissions = computed<Permission[]>(() => authStore.permissions);
    const role = computed(() => authStore.user?.role ?? null);
    const specialty = computed(() => authStore.specialty);

    return { can, permissions, role, specialty };
}
