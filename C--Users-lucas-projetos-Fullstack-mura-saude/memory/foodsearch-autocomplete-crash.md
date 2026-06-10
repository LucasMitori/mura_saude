---
name: foodsearch-autocomplete-crash
description: FoodSearch v-autocomplete crashed on OFF results (item.raw undefined) — fixed
metadata:
  type: project
---

Symptom: typing in `app/components/FoodSearch.vue` (Open Food Facts search on /meals/quick) threw `TypeError: Cannot read properties of undefined (reading 'name')` at the `#item` slot, plus a VVirtualScrollItem render error.

Two causes:
1. The slot had an explicit `:title="item.raw.name"` — redundant (`v-bind="itemProps"` already supplies the title) and crashes when Vuetify hands the slot a transient item whose `raw` is undefined.
2. OFF returns products with **empty or duplicate `code`** values; with `item-value="code"` those collide in the virtual scroll and yield undefined raw items.

Fix: removed the explicit `:title` (rely on `itemProps`), guard every `item.raw?.…` access, and a `normalizeResults()` that drops items missing `name`/`per100g` and rewrites codes to be unique (`food-${i}`, plus `-${i}` on collision). Added an out-of-order response guard (`reqId`).

Verified in preview by mocking `/api/nutrition/search` with empty-code, duplicate-code and missing-per100g items: all 5 valid items render, the invalid one is filtered, `capturedErrors: []`. `pnpm build` green. (Selecting a result couldn't be driven by synthetic clicks in the headless preview — Vuetify treats it as blur — but the emit→onFoodSelected wiring is unchanged.) See [[rebuild-plan]].
