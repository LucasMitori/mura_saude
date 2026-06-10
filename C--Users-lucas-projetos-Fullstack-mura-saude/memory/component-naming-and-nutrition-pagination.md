---
name: component-naming-and-nutrition-pagination
description: Daily card resolve-fail (case-insensitive FS), defensive MeasurementCard, OFF 502 + infinite scroll
metadata:
  type: project
---

## Daily card "Failed to resolve component" (FIXED)
`app/pages/daily/[date].vue` used `<MealCard>`/`<MeasurementCard>` but the files were `Mealcard.vue`/`Measurementcard.vue` → Nuxt auto-imported them as `Mealcard`/`Measurementcard`, so the PascalCase tags didn't resolve.

**Case-only renames are unreliable on Windows (case-insensitive FS):** renaming `Mealcard.vue`→`MealCard.vue` left Vite's module graph pointing at the stale lowercase module, so resolution still failed (and even corrupted the page render). Fix that actually worked: **rename to brand-new distinct names** `DailyMealCard.vue` / `DailyMeasurementCard.vue`, **explicit-import** them in the page (`import DailyMealCard from "~/components/DailyMealCard.vue"`), update the tags, and **clear `.nuxt` + `node_modules/.vite` + restart**. Verified: 2 meal cards + 1 measurement card render.
Lesson: never rely on a case-only rename to fix a component-name mismatch; use a fresh filename.

## DailyMeasurementCard made defensive (FIXED)
It read 10 bioimpedance fields directly (`d.muscleMass.value`, etc.); a partial/older measurement (missing fields) crashed the whole page render. Now a `num()` helper handles `{value}` objects AND plain numbers AND missing fields, and only present metrics are shown.

## Nutrition: 502s + infinite scroll (FIXED)
- OFF `cgi/search.pl` is flaky/rate-limited → surfaced as console 502s. `server/utils/nutrition.ts` `offFetch()` now retries once; `search.get.ts` catches and returns 200 `{foods:[], degraded:true}` instead of a 502.
- Added pagination: endpoint takes `page`, returns `hasMore` (rawCount>=20). `FoodSearch.vue` does infinite scroll via a `#append-item` sentinel + `v-intersect` → `loadMore()` appends the next page (dedup codes persist across pages). Verified: scrolling loaded page 2.

See [[foodsearch-autocomplete-crash]], [[rebuild-plan]].
