---
name: workout-routines-feature
description: Treinos (workout routines) feature — wger exercise API, routines CRUD, WorkoutForm, daily edit fix
metadata:
  type: project
---

Added a full workout-routine system (2026-06) so trainers/admin can build reusable routines (Treino A/B/C) and apply them to a day.

Backend:
- Exercise data from **wger.de** public API (free, no key) via server proxy `server/utils/wger.ts` + `server/api/exercises/search.get.ts` (retry + graceful 200-degrade, like nutrition). Normalizes to `{ id, name, category, muscles, imageUrl }`. **wger `language` must be 2-letter short_names** (`en,pt,es`), NOT `"english"` — an invalid value matches no language and the search returns empty (this was the "nothing shows when I type supino" bug). Can't be tested from this sandbox (outbound HTTPS blocked); works on the user's machine/Vercel.
- `workoutRoutines` Mongo collection: `server/utils/routine-helpers.ts` (RoutineDoc, normalizeRoutineExercise, recomputeRoutineTotals) + `server/api/routines/{index.get, index.post, [id].delete}` (plus PUT if present). Admin writes, viewers read admin's (getAdminUserId pattern).
- Types: `shared/types/workout-routine.ts` (WorkoutRoutine, ExerciseSuggestion, ExerciseSearchResult).

Frontend:
- `app/composables/useExercises.ts`, `useRoutines.ts`.
- `app/components/ExerciseSearch.vue` (wger autocomplete, same hardening as FoodSearch), `ExerciseListEditor.vue` (defineModel<Exercise[]>, add/remove/edit exercises, MET-based calorie auto-estimate, guesses muscle/category from wger category), `WorkoutForm.vue` (start/end time + ExerciseListEditor + apply-saved-routine select → emits WorkoutSession with computed totals).
- `app/pages/treinos/index.vue` — list/create/edit/delete routine cards; sidebar link added in `default.vue`.

Daily workout edit fix: `app/pages/daily/[date].vue` "Editar" used to navigate to the broken 2000-line `/daily/new` (the reported error). Now opens an inline `<WorkoutForm>` dialog → `updateWorkout(date, workout)` (or null to clear). Verified: opens with existing exercises loaded, no errors.

URL standardized to English: the routines page is `app/pages/workout/index.vue` → route **/workout** (was /treinos); sidebar + `/workout/**` ssr:false routeRule updated. The `treinos.*` PERMISSION names stayed (internal ids). Exercise search now merges a curated PT list (`server/utils/exercises-local.ts`, ~60 exercises) BEFORE wger so common terms ("supino") always return results even if wger is empty/unreachable — `exercises/search.get.ts` only flags degraded when both are empty. MealForm food table uses `<v-number-input>` (stable in Vuetify 4). Default theme is now **light** (dark is secondary) with a full light palette in nuxt.config — note: some component scoped styles still use hardcoded dark `rgba(255,255,255,0.0x)` backgrounds that look faint in light mode (future polish).

Also enhanced daily/[date]: summary cards (icon + title/subtitle/description/value+unit, data-driven), meal-table P/C/G/F tooltips, bioimpedance redesigned as uniform icon-tile grid, richer workout card. See [[component-naming-and-nutrition-pagination]], [[rebuild-plan]].
