import type { H3Event } from "h3";
import { ObjectId } from "mongodb";
import { getAuthUser } from "#server/utils/auth";
import { getDatabase } from "#server/utils/mongodb";
import { resolvePermissions, normalizeRole } from "../../shared/permissions";
import type { Permission, UserRole, ManagerSpecialty } from "../../shared/types/auth";

export function toObjectIdOrThrow(id: string, status = 400): ObjectId {
    if (!id || typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
        throw createError({ statusCode: status, message: "Invalid identifier" });
    }
    return new ObjectId(id);
}

export interface AuthContext {
    userId: string;
    email: string;
    role: UserRole;
    specialty: ManagerSpecialty | null;
    permissions: Permission[];
}

/**
 * Resolve the caller's CURRENT role/specialty from the database — the single
 * source of truth. The JWT only proves identity (it's signed; a client cannot
 * forge it or change the userId). We deliberately IGNORE any role the JWT or the
 * request body claims and recompute permissions server-side, so privilege
 * escalation via request tampering is impossible, and a role change by the admin
 * takes effect on the user's very next request (no stale-token window).
 */
export async function getAuthContext(event: H3Event): Promise<AuthContext> {
    const auth = getAuthUser(event); // verifies JWT signature + issuer
    const oid = toObjectIdOrThrow(auth.userId, 401);

    const db = await getDatabase();
    const user = await db
        .collection("users")
        .findOne({ _id: oid }, { projection: { role: 1, specialty: 1, email: 1 } });

    if (!user) {
        throw createError({ statusCode: 401, message: "User no longer exists" });
    }

    const role = normalizeRole(user.role);
    const specialty = (user.specialty as ManagerSpecialty | undefined) ?? null;

    return {
        userId: auth.userId,
        email: (user.email as string) || auth.email,
        role,
        specialty,
        permissions: resolvePermissions(role, specialty),
    };
}

/** Require a specific permission; 403 otherwise. Returns the auth context. */
export async function requirePermission(
    event: H3Event,
    permission: Permission,
): Promise<AuthContext> {
    const ctx = await getAuthContext(event);
    if (!ctx.permissions.includes(permission)) {
        throw createError({
            statusCode: 403,
            message: "Você não tem permissão para esta ação",
        });
    }
    return ctx;
}

/** Admin-only gate (role resolved from DB, not the token claim). */
export async function requireAdmin(event: H3Event): Promise<AuthContext> {
    const ctx = await getAuthContext(event);
    if (ctx.role !== "admin") {
        throw createError({
            statusCode: 403,
            message: "Only admin users can perform this action",
        });
    }
    return ctx;
}

export async function getAdminUserId(): Promise<string | null> {
    const db = await getDatabase();
    const adminUser = await db
        .collection("users")
        .findOne({ role: "admin" }, { projection: { _id: 1 } });
    return adminUser ? adminUser._id.toString() : null;
}

/**
 * This is a single-patient app: all health/workout data belongs to the admin
 * (the patient). Managers/admin EDIT that data; everyone else views it. So every
 * read and write targets the admin's userId, never the caller's.
 */
export async function getDataOwnerId(ctx: AuthContext): Promise<string> {
    const adminId = await getAdminUserId();
    return adminId || ctx.userId;
}
