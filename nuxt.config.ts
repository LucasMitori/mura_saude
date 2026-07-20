import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

// Resolve the absolute path of the actual .css file shipped by Vuetify v4.
// This is hardcoded against pnpm's path because the vuetify-nuxt-module
// rewrites every .css import inside vuetify to .sass — which needs the
// sass-embedded preprocessor that we cannot install here (npm registry TLS blocked).
const vuetifyMainCss = pathResolve(
    dirname(fileURLToPath(import.meta.url)),
    "node_modules/vuetify/lib/styles/main.css",
);
const mdiFontCss = pathResolve(
    dirname(fileURLToPath(import.meta.url)),
    "node_modules/@mdi/font/css/materialdesignicons.css",
);

export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },

    // Do NOT ship client source maps to the browser in production — without them
    // DevTools shows only the minified bundle, not the original .vue/.ts source.
    // (Server maps stay on for our own debugging; they're never sent to clients.)
    sourcemap: { client: false, server: true },

    // We only inject vuetify CSS ourselves. The vuetify-nuxt-module's icons
    // feature appends `@mdi/font/css/materialdesignicons.css` (a bare specifier)
    // into nuxt.options.css later; we replace that with the absolute path
    // inside the `ready` hook so Nuxt emits a working <link>.
    css: [vuetifyMainCss, mdiFontCss, "~/assets/css/vuetify-cascade-fix.css"],

    hooks: {
        ready(nuxt) {
            const bareMdi = "@mdi/font/css/materialdesignicons.css";
            nuxt.options.css = nuxt.options.css.filter((c) => c !== bareMdi);
        },
    },

    build: {
        transpile: ["vuetify"],
    },

    vite: {
        ssr: {
            noExternal: ["vuetify"],
        },
        optimizeDeps: {
            include: ["vuetify"],
        },
        resolve: {
            alias: {
                "vuetify/styles": vuetifyMainCss,
                "@mdi/font/css/materialdesignicons.css": mdiFontCss,
            },
        },
        plugins: [
            {
                name: "force-vuetify-css-over-sass",
                enforce: "pre",
                resolveId(source) {
                    if (source === "vuetify/styles") {
                        return { id: vuetifyMainCss, moduleSideEffects: true };
                    }
                    if (
                        typeof source === "string" &&
                        source.endsWith("/main.sass") &&
                        source.includes("/vuetify/")
                    ) {
                        return { id: vuetifyMainCss, moduleSideEffects: true };
                    }
                    return null;
                },
            },
        ],
    },

    modules: [
        "@pinia/nuxt",
        [
            "vuetify-nuxt-module",
            {
                moduleOptions: {
                    // Boolean (true) makes the module SKIP its sass-rewriting Vite plugin
                    // (module.mjs line 1291). We supply the CSS ourselves below.
                    styles: true,
                    // Prevent the module from injecting `vuetify/styles` into nuxt.options.css
                    // (module.mjs line 1381) — we add `main.css` directly to avoid the
                    // resolveCssFactory that rewrites .css → .sass.
                    disableVuetifyStyles: true,
                    // Prevent the module from configuring sass/scss preprocessors
                    // (module.mjs line 1262) — we use the prebuilt main.css so no sass needed.
                    disableModernSassCompiler: true,
                    autoImport: true,
                },
                vuetifyOptions: {
                    icons: {
                        defaultSet: "mdi",
                    },
                    theme: {
                        defaultTheme: "light",
                        themes: {
                            dark: {
                                colors: {
                                    primary: "#4CAF50",
                                    secondary: "#03DAC6",
                                    accent: "#FF5722",
                                    background: "#0E1014",
                                    surface: "#16191F",
                                    "surface-bright": "#1E2128",
                                    "on-surface": "#E8ECEF",
                                    error: "#EF5350",
                                    info: "#42A5F5",
                                    success: "#66BB6A",
                                    warning: "#FFA726",
                                },
                            },
                            light: {
                                colors: {
                                    primary: "#2E7D32",
                                    secondary: "#00897B",
                                    accent: "#FF5722",
                                    background: "#F4F6F9",
                                    surface: "#FFFFFF",
                                    "surface-bright": "#FFFFFF",
                                    "on-surface": "#1A1C20",
                                    error: "#D32F2F",
                                    info: "#1976D2",
                                    success: "#2E7D32",
                                    warning: "#EF6C00",
                                },
                            },
                        },
                    },
                    defaults: {
                        VBtn: { rounded: "lg" },
                        VCard: { rounded: "lg" },
                        VTextField: { variant: "outlined", density: "comfortable" },
                        VSelect: { variant: "outlined", density: "comfortable" },
                        VTextarea: { variant: "outlined" },
                    },
                },
            },
        ],
    ],

    typescript: {
        strict: true,
    },

    app: {
        pageTransition: { name: "page", mode: "out-in" },
        layoutTransition: { name: "layout", mode: "out-in" },
        head: {
            title: "Mura Saúde",
            meta: [
                { name: "viewport", content: "width=device-width,initial-scale=1" },
                { name: "description", content: "Mura Saúde — acompanhe sua saúde diária" },
                { name: "theme-color", content: "#4CAF50" },
            ],
            link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
        },
    },

    router: {
        options: {
            scrollBehaviorType: "smooth",
        },
    },

    // App is an authenticated SPA — protected pages depend on localStorage state
    // that only exists on the client. Render those pages client-side to avoid
    // hydration mismatches. /login stays SSR for fast first paint.
    routeRules: {
        "/": { ssr: false },
        "/reports": { ssr: false },
        "/profile": { ssr: false },
        "/daily/**": { ssr: false },
        "/meals/**": { ssr: false },
        "/workout/**": { ssr: false },
        "/diet/**": { ssr: false },
        "/admin/**": { ssr: false },
    },

    nitro: {
        routeRules: {
            "/**": {
                headers: {
                    "X-Frame-Options": "DENY",
                    "X-Content-Type-Options": "nosniff",
                    // Send no Referer header anywhere — nothing about the user's
                    // URLs leaks to third parties.
                    "Referrer-Policy": "no-referrer",
                    "Permissions-Policy":
                        "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
                    "X-XSS-Protection": "1; mode=block",
                },
            },
            "/api/**": {
                // No `cors: true` — the SPA calls the API same-origin, so we do NOT
                // emit `Access-Control-Allow-Origin: *`. This blocks other websites
                // from making cross-origin requests to the API.
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, private",
                    "X-Content-Type-Options": "nosniff",
                },
            },
        },
    },

    runtimeConfig: {
        mongodbUri: process.env.MONGODB_URI || "",
        jwtSecret: process.env.JWT_SECRET || "",
        adminUsername: process.env.ADMIN_USERNAME || "admin",
        adminEmail: process.env.ADMIN_EMAIL || "",
        adminPassword: process.env.ADMIN_PASSWORD || "",
        rateLimitMax: process.env.RATE_LIMIT_MAX || "20",
        rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS || "60000",
        // Required to view /docs in production; empty disables docs in prod.
        apiDocsToken: process.env.API_DOCS_TOKEN || "",
    },
});
