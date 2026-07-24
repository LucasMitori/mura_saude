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
    "diet.view",
    "diet.edit",
    "exams.view",
    "exams.edit",
    "users.manage",
];

// Everyone who is logged in can VIEW the dashboard, reports, treinos, health
// data and the diet plan (this is a single-patient app — viewers see the
// patient's data read-only).
const VIEW_PERMS: Permission[] = [
    "dashboard.view",
    "reports.view",
    "treinos.view",
    "nutrition.view",
    "diet.view",
];

// personal_trainer: manages workout routines (no delete — archive instead),
// views everything else.
const TRAINER_PERMS: Permission[] = [
    ...VIEW_PERMS,
    "treinos.create",
    "treinos.edit",
    "treinos.archive",
];

// nutritionist: STRICTLY read-only on the patient's data (dashboard/reports/
// treinos/health are view-only). Their write capability is the diet domain
// (building diet plans on /diet). They also VIEW the patient's medical exam
// documents (exams.view) — relevant to nutrition decisions — but cannot
// upload or delete them. They can never touch meals, measurements, water,
// workouts, users or admin settings.
const NUTRITIONIST_PERMS: Permission[] = [...VIEW_PERMS, "diet.edit", "exams.view"];

// medico (doctor): PURE read-only. Sees the patient's data (dashboard/reports/
// treinos/diet) and the medical exam documents targeted to doctors
// (exams.view) — but edits/creates/deletes NOTHING, not even diets. The
// difference from the nutritionist is exactly this: no diet.edit, and exam
// documents are audience-targeted (see shared/types/exam.ts) so the admin
// chooses whether each upload is for the médico, the nutricionista, or both.
const MEDIC_PERMS: Permission[] = [...VIEW_PERMS, "exams.view"];

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
            if (specialty === "medico") return [...MEDIC_PERMS];
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
