---
name: rebuild-plan
description: Scope and key decisions for the Mura Saúde frontend overhaul (2026-06)
metadata:
  type: project
---

Mura Saúde is a Nuxt 4 + Vue 3.5 + Vuetify 4 + Pinia + MongoDB health-tracking app (meals/macros, OKOK bioimpedance, water, workouts), deployed on Vercel. Admin writes data; viewers (nutricionista, preparador físico, médico) read it.

The 2026-06 "rebuild" is an **aggressive frontend/UX overhaul on the existing hardened backend**, NOT a from-scratch rebuild. Backend, data model ([shared/types/daily.ts]), and security hardening are kept.

Decisions (user-confirmed 2026-06-08):
- Approach: overhaul frontend, keep backend.
- Nutrition source: **Open Food Facts** via a server proxy (`$fetch`, no new npm dependency — npm registry TLS is blocked in this env, see [[vuetify-css-workaround]]).
- Language: **pt-BR only** (fix English login + mixed dashboard).

Main gaps being addressed: no `app/error.vue`; no nutrition lookup (foods typed by hand); inconsistent language; monolithic `app/pages/daily/new.vue` (~2000 lines) needs decomposing; duplicate `components/` (root, deleted) vs `app/components/` (canonical in Nuxt 4); no `app/plugins` (chart.js re-registered per page). See [[committed-credentials-warning]].

Progress (2026-06-08):
- Increment 1 DONE + `pnpm build` green: nutrition via Open Food Facts (`server/utils/nutrition.ts`, `server/api/nutrition/search.get.ts` + `barcode/[code].get.ts`, `app/composables/useNutrition.ts`, `app/components/FoodSearch.vue` wired into `MealForm.vue` — picking a food auto-fills+rescales kcal/macros by grams via a transient `_per100g` stripped on submit). Added `app/error.vue` (404/500), `app/plugins/chartjs.client.ts` (removed per-page `ChartJS.register`), `app/composables/useSnackbar.ts` (mounted in `default.vue`), login.vue fully pt-BR.
- TODO increments: 2) layout+dashboard polish; 3) decompose `daily/new.vue`; 4) reports/daily-detail/profile polish + pt-BR sweep; 5) README/.env scrub (rotate secrets) + final build. `vue-tsc` can't be installed (blocked registry) — rely on `pnpm build`.
