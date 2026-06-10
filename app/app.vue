<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
</template>

<style>
/* Vuetify overlay (v-menu, v-select dropdown, v-date-picker popover) — make
   sure teleported content always inherits the dark surface so menus never
   render with a transparent / blank background. */
.v-overlay__content > .v-list,
.v-overlay__content > .v-card,
.v-overlay__content > .v-sheet {
    background-color: rgb(var(--v-theme-surface-bright, var(--v-theme-surface))) !important;
    color: rgb(var(--v-theme-on-surface)) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.06);
}
.v-overlay__content .v-list-item:hover {
    background-color: rgba(76, 175, 80, 0.08);
}
.v-overlay__content .v-list-item--active {
    background-color: rgba(76, 175, 80, 0.16);
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}
.page-enter-from {
    opacity: 0;
    transform: translateY(6px);
}
.page-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

.layout-enter-active,
.layout-leave-active {
    transition: opacity 0.3s ease;
}
.layout-enter-from,
.layout-leave-to {
    opacity: 0;
}

/* Vuetify global polish */
html {
    overflow-y: auto !important;
    scrollbar-width: thin;
}
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.35);
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(128, 128, 128, 0.55);
}

/* Card hover lift */
.v-card {
    transition: box-shadow 0.2s ease, transform 0.2s ease !important;
}

/* Subtle gradient background for the app in dark theme.
   IMPORTANT: scope to `.v-application` (the single root element). The bare
   `.v-theme--dark` selector also matches every card, app-bar and drawer — which
   all carry that class — and the `background` shorthand would override their
   surface colors, rendering whole sections invisible in dark mode (the
   "blank space above the content" bug). `.v-application.v-theme--dark` matches
   only the root, so card/surface backgrounds are left intact. */
.v-application.v-theme--dark {
    background:
        radial-gradient(at 0% 0%, rgba(76, 175, 80, 0.05), transparent 40%),
        radial-gradient(at 100% 100%, rgba(3, 218, 198, 0.05), transparent 40%),
        #0E1014;
}
</style>
