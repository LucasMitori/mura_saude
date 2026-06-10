# Memory Index

- [Rebuild plan](rebuild-plan.md) — Mura Saúde 2026-06 frontend overhaul: scope + decisions (OFF nutrition, pt-BR, keep backend)
- [Vuetify CSS workaround](vuetify-css-workaround.md) — why nuxt.config hardcodes prebuilt main.css; don't add sass / npm deps
- [Committed credentials warning](committed-credentials-warning.md) — live admin/Mongo secrets in repo; rotate + scrub
- [Drawer scrim blank-space fix](drawer-scrim-blankspace-fix.md) — dark-mode "blank space" was an unscoped .v-theme--dark background bleeding onto cards; fixed by scoping to .v-application
- [FoodSearch autocomplete crash](foodsearch-autocomplete-crash.md) — OFF dup/empty codes + explicit :title crashed the v-autocomplete; fixed with guards + normalizeResults
- [Component naming + nutrition pagination](component-naming-and-nutrition-pagination.md) — daily card resolve-fail (case-insensitive FS rename trap), defensive MeasurementCard, OFF 502 retry/degrade + infinite scroll
- [Workout routines feature](workout-routines-feature.md) — wger exercise API, routines CRUD, /treinos page, WorkoutForm; daily workout-edit fix; daily/[date] visual overhaul
- [RBAC roles & permissions](rbac-roles-permissions.md) — admin/manager(+specialty)/user roles, server-authoritative permission enforcement, /admin/users, treinos archive
