import { useAuthStore } from "~/stores/auth.store";

// On every client load, restore the session and re-fetch the profile from the
// server so role/specialty/permissions are always current (the server is the
// source of truth). This makes an admin's role change take effect on the user's
// next page load without requiring a re-login, and logs out a stale/invalid
// token. Runs in the background so it never blocks the first render.
export default defineNuxtPlugin(() => {
    const authStore = useAuthStore();
    authStore.restoreAuth();
    if (authStore.token) {
        authStore.fetchProfile();
    }
});
