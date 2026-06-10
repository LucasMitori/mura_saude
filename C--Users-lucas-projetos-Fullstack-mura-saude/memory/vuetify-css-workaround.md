---
name: vuetify-css-workaround
description: Why nuxt.config.ts hardcodes Vuetify's prebuilt main.css instead of sass
metadata:
  type: project
---

The npm registry is TLS-blocked in this environment, so `sass-embedded` cannot be installed. vuetify-nuxt-module normally rewrites Vuetify's `.css` imports to `.sass` (needs that preprocessor). [nuxt.config.ts] works around this by: pointing aliases at the prebuilt `node_modules/vuetify/lib/styles/main.css`, a `force-vuetify-css-over-sass` Vite plugin that resolves `vuetify/styles` and `*/main.sass` to that css, and module options `disableVuetifyStyles` + `disableModernSassCompiler` + `styles: true`.

**Do not "clean this up" or try to add sass** — it will break the build. Same constraint means new features should avoid adding npm dependencies; prefer server-side `$fetch` proxies (e.g. Open Food Facts). See [[rebuild-plan]].
