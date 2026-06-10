---
name: drawer-scrim-blankspace-fix
description: Dark-mode "blank space above content" bug — unscoped .v-theme--dark background bled onto cards
metadata:
  type: project
---

## REAL root cause (confirmed): dark-theme background bleed
Symptom: in DARK mode only, the top of every page is a blank band; content appears ~30% down; switching to LIGHT mode fixes it.

Cause: `app/app.vue` had a global unscoped rule `.v-theme--dark { background: <gradient>, #0E1014; }`. Vuetify puts `v-theme--dark` on EVERY themed element (cards, app-bar, drawer), so the `background` shorthand overrode every card's surface to the page color (rgb(14,16,20)) — cards rendered invisible in dark mode (the "blank" band). Widgets/charts below stayed visible because their content has its own colors. Light mode was fine because the rule only matches dark.

Fix: scope to the root — `.v-application.v-theme--dark { background: ... }` (only the root has BOTH classes; cards keep their surface). Verified on live DOM: stat card bg went from rgb(14,16,20) → rgb(76,175,80) primary; surface card → rgb(22,25,31); screenshot shows all cards visible, no blank band. `pnpm build` green.

Diagnosis lesson: I measured element POSITIONS (always correct: content at top:60) and wrongly concluded "stale build" 2x. The bug was COLOR, not position/space — cards were present but invisible. Always check computed `background-color`/contrast, not just geometry, for "blank/missing content" reports; reproduce in the exact theme the user reports.

## Secondary fix (also applied): stuck nav-drawer scrim

Root cause: `app/layouts/default.vue`'s `<v-navigation-drawer location="left">` defaulted to open (`drawer = ref(true)`). On `ssr:false` pages the drawer briefly evaluates as mobile/temporary on mount, renders a `.v-navigation-drawer__scrim`, then flips to permanent — and the scrim gets **stuck in `fade-transition-leave-from`**: a full-page `position:absolute` black overlay (opacity 0.2, z-index 1003) covering ALL content + the footer with `pointer-events:auto`. `document.elementFromPoint` over the content returned the scrim, confirming it sat on top of everything.

Fix: control the drawer mode by breakpoint so no scrim is created on desktop —
`const { mobile } = useDisplay(); const drawer = ref(!mobile.value); watch(mobile, m => drawer.value = !m);`
and bind `:temporary="mobile"` on the drawer. Verified in the live preview (with mocked data via a temporary `?__diag=1` plugin): `scrimExists:false`, `elementFromPoint` now returns real content, drawer permanent on desktop / closed-on-load for mobile. `pnpm build` green.

Diagnosis lesson: the bug only appeared with the page **fully rendered** (content present) — empty-data measurements showed content at top:60 with no gap and hid it. Always reproduce layout/stacking bugs with real/mocked content, and use `elementFromPoint` to find overlay culprits. See [[rebuild-plan]].
