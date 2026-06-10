---
name: rbac-roles-permissions
description: Role/permission (RBAC) system — roles, specialties, server-authoritative enforcement
metadata:
  type: project
---

RBAC added 2026-06. Roles are fixed in code (admin/manager/user); a `manager` also has a `specialty` (personal_trainer | nutritionist). Permissions are granular (`treinos.create`, `nutrition.edit`, `users.manage`, etc.) and resolved from role+specialty in **`shared/permissions.ts` (`resolvePermissions`)** — imported by both client and server so they never drift.

Permission matrix: admin=all; manager·personal_trainer = view-all + treinos.create/edit/archive (NOT delete); manager·nutritionist = view-all + nutrition.edit; user = view-all only. Legacy role "viewer" normalizes to "user".

SECURITY MODEL (user's hard requirement — no privilege escalation via request tampering):
- `server/utils/roles.ts` `getAuthContext()` verifies the signed JWT (identity only), then re-reads role/specialty from the **DB** and computes permissions server-side. The JWT/body role is IGNORED. `requirePermission(event, perm)` gates every mutation. A role change takes effect on the user's next request (no stale-token window).
- Single-patient app: all data is the admin's. Writes target `getDataOwnerId()` (admin's id); managers edit THAT data. Reads (any authed) also target the admin's data — viewers see it read-only.
- Registration ALWAYS creates role=user (never from body). `me.put` self-edit can't change role. Role changes only via `PUT /api/admin/users/:id` (users.manage; guards: can't change own role, can't demote last admin).
- Client `authStore.can()` / `definePageMeta({ requiresPermission })` + `permission.global.ts` are UX-only; the server is the real gate. `auth-init.client.ts` re-fetches the profile on load so client perms stay fresh.

UI: sidebar/buttons gated by `can()`; `/admin/users` page (users.manage) to change roles; `/treinos` has Ativas/Arquivadas tabs (treinos.archive archives, treinos.delete deletes — admin only). Routine `archived` field + `POST /api/routines/:id/archive`. See [[workout-routines-feature]].
