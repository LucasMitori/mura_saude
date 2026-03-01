export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },

    modules: [
        "@pinia/nuxt",
        [
            "vuetify-nuxt-module",
            {
                moduleOptions: {
                    styles: true,
                    autoImport: true,
                },
                vuetifyOptions: {
                    theme: {
                        defaultTheme: "dark",
                        themes: {
                            dark: {
                                colors: {
                                    primary: "#4CAF50",
                                    secondary: "#03DAC6",
                                    accent: "#FF5722",
                                    background: "#121212",
                                    surface: "#1E1E1E",
                                },
                            },
                            light: {
                                colors: {
                                    primary: "#4CAF50",
                                    secondary: "#03DAC6",
                                    accent: "#FF5722",
                                },
                            },
                        },
                    },
                },
            },
        ],
    ],

    typescript: {
        strict: true,
    },

    runtimeConfig: {
        mongodbUri: process.env.MONGODB_URI || "",
        jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    },
});
