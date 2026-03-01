import { defineStore } from "pinia";
import type { UserProfile, AuthResponse } from "~~/shared/types/auth";

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null as UserProfile | null,
        token: null as string | null,
        loading: false,
        error: null as string | null,
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,
        isAdmin: (state) => state.user?.role === "admin",
        authHeaders: (state) => ({
            Authorization: state.token ? `Bearer ${state.token}` : "",
        }),
    },

    actions: {
        async register(name: string, email: string, password: string) {
            this.loading = true;
            this.error = null;
            try {
                const data = await $fetch<AuthResponse>("/api/auth/register", {
                    method: "POST",
                    body: { name, email, password },
                });
                this.user = data.user;
                this.token = data.token;
                this.persistAuth();
            } catch (e: unknown) {
                this.error = this.extractError(e);
                throw e;
            } finally {
                this.loading = false;
            }
        },

        async login(email: string, password: string) {
            this.loading = true;
            this.error = null;
            try {
                const data = await $fetch<AuthResponse>("/api/auth/login", {
                    method: "POST",
                    body: { email, password },
                });
                this.user = data.user;
                this.token = data.token;
                this.persistAuth();
            } catch (e: unknown) {
                this.error = this.extractError(e);
                throw e;
            } finally {
                this.loading = false;
            }
        },

        async fetchProfile() {
            if (!this.token) return;
            try {
                const user = await $fetch<UserProfile>("/api/auth/me", {
                    headers: this.authHeaders,
                });
                this.user = user;
                this.persistAuth();
            } catch {
                this.logout();
            }
        },

        logout() {
            this.user = null;
            this.token = null;
            if (typeof window !== "undefined") {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
            }
        },

        persistAuth() {
            if (typeof window !== "undefined" && this.token && this.user) {
                localStorage.setItem("auth_token", this.token);
                localStorage.setItem("auth_user", JSON.stringify(this.user));
            }
        },

        restoreAuth() {
            if (typeof window !== "undefined") {
                const token = localStorage.getItem("auth_token");
                const userStr = localStorage.getItem("auth_user");
                if (token && userStr) {
                    this.token = token;
                    this.user = JSON.parse(userStr);
                }
            }
        },

        extractError(e: unknown): string {
            if (e && typeof e === "object" && "data" in e) {
                const data = (e as Record<string, unknown>).data;
                if (data && typeof data === "object" && "message" in data) {
                    return (
                        (data as Record<string, string>).message ??
                        "An unexpected error occurred"
                    );
                }
            }
            if (e instanceof Error) return e.message;
            return "An unexpected error occurred";
        },
    },
});
