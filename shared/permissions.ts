import type { UserRole, ManagerSpecialty, Permission } from "./types/auth";

// Single source of truth for role → permission resolution. Imported by BOTH the
// server (authoritative enforcement) and the client (UX gating only). Defining
// it once guarantees the two never drift.

export const ALL_PERMISSIONS: Permission[] = [
    "dashboard.view",
    "reports.view",
    "treinos.view",
    "treinos.create",
    "treinos.edit",
    "treinos.archive",
    "treinos.delete",
    "nutrition.view",
    "nutrition.edit",
    "users.manage",
];

// Everyone who is logged in can VIEW the dashboard, reports, treinos and health
// data (this is a single-patient app — viewers see the patient's data read-only).
const VIEW_PERMS: Permission[] = [
    "dashboard.view",
    "reports.view",
    "treinos.view",
    "nutrition.view",
];

// personal_trainer: manages workout routines (no delete — archive instead),
// views everything else.
const TRAINER_PERMS: Permission[] = [
    ...VIEW_PERMS,
    "treinos.create",
    "treinos.edit",
    "treinos.archive",
];

// nutritionist: edits the patient's nutrition/health data, views treinos/reports.
const NUTRITIONIST_PERMS: Permission[] = [...VIEW_PERMS, "nutrition.edit"];

export function resolvePermissions(
    role: UserRole | string | null | undefined,
    specialty?: ManagerSpecialty | string | null,
): Permission[] {
    switch (role) {
        case "admin":
            return [...ALL_PERMISSIONS];
        case "manager":
            if (specialty === "nutritionist") return [...NUTRITIONIST_PERMS];
            if (specialty === "personal_trainer") return [...TRAINER_PERMS];
            // Manager without a specialty set yet → safe view-only.
            return [...VIEW_PERMS];
        case "user":
        case "viewer": // legacy value → treated as standard user
        default:
            return [...VIEW_PERMS];
    }
}

export function hasPermission(
    permissions: Permission[] | undefined | null,
    perm: Permission,
): boolean {
    return !!permissions && permissions.includes(perm);
}

// Normalize any stored/legacy role string to a current UserRole.
export function normalizeRole(role: unknown): UserRole {
    if (role === "admin" || role === "manager" || role === "user") return role;
    return "user";
}
