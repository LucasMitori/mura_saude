import { getDatabase } from "#server/utils/mongodb";
import { getAuthUser, hashPassword, verifyPassword, generateToken } from "#server/utils/auth";
import { toObjectIdOrThrow } from "#server/utils/roles";
import { sanitizeMongoInput, validateString } from "#server/utils/validators";
import { validatePassword } from "#server/utils/password-rules";
import { rateLimit } from "#server/utils/rate-limit";
import { writeAudit } from "#server/utils/audit";
import { resolvePermissions, normalizeRole } from "../../../shared/permissions";
import type { ManagerSpecialty } from "../../../shared/types/auth";

interface UpdateProfileBody {
    name?: string;
    avatar?: string | null;
    currentPassword?: string;
    newPassword?: string;
}

// A 5 MB image becomes ~6.7 MB as base64; allow headroom up to ~7.2 MB.
const MAX_AVATAR_BYTES = 7_200_000;
const ALLOWED_AVATAR_PREFIX = ["data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,", "data:image/gif;base64,"];

export default defineEventHandler(async (event) => {
    rateLimit(event, { key: "profile-update", max: 20, windowMs: 60_000 });

    const { userId } = getAuthUser(event);
    const oid = toObjectIdOrThrow(userId, 401);

    const rawBody = await readBody<UpdateProfileBody>(event);
    const body = sanitizeMongoInput(rawBody);

    const db = await getDatabase();
    const users = db.collection("users");

    const user = await users.findOne({ _id: oid });
    if (!user) {
        throw createError({ statusCode: 404, message: "User not found" });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    // Set when the password changes — drives token revocation below.
    let newTokenVersion: number | null = null;

    if (typeof body.name === "string") {
        const name = validateString(body.name, "name", 80).trim();
        if (name.length < 2) {
            throw createError({ statusCode: 400, message: "Name is too short" });
        }
        updates.name = name;
    }

    if (body.avatar === null) {
        updates.avatar = null;
    } else if (typeof body.avatar === "string" && body.avatar.length > 0) {
        const a = body.avatar;
        if (!ALLOWED_AVATAR_PREFIX.some((p) => a.startsWith(p))) {
            throw createError({
                statusCode: 400,
                message: "Avatar must be a PNG, JPEG, WebP or GIF data URL",
            });
        }
        if (a.length > MAX_AVATAR_BYTES) {
            throw createError({
                statusCode: 413,
                message: "Avatar too large (max 5 MB).",
            });
        }
        updates.avatar = a;
    }

    if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
        if (!body.currentPassword || typeof body.currentPassword !== "string") {
            throw createError({
                statusCode: 400,
                message: "currentPassword is required to set a new password",
            });
        }
        const ok = await verifyPassword(body.currentPassword, user.password as string);
        if (!ok) {
            throw createError({
                statusCode: 401,
                message: "Current password is incorrect",
            });
        }
        const check = validatePassword(body.newPassword);
        if (!check.valid) {
            throw createError({
                statusCode: 400,
                message: check.errors.join(". "),
            });
        }
        updates.password = await hashPassword(body.newPassword);
        // Changing the password REVOKES every token issued so far — otherwise a
        // stolen token would keep working after the victim "secured" the account.
        newTokenVersion = Number(user.tokenVersion || 0) + 1;
        updates.tokenVersion = newTokenVersion;
    }

    if (Object.keys(updates).length === 1) {
        // Only updatedAt — no real fields. Don't write.
        return await respond(oid);
    }

    await users.updateOne({ _id: oid }, { $set: updates });

    // Hand the caller a token minted with the new version so the user who just
    // changed their own password stays signed in on THIS device only.
    let freshToken: string | undefined;
    if (newTokenVersion !== null) {
        const role = normalizeRole(user.role);
        freshToken = generateToken(userId, user.email as string, role, newTokenVersion);
        await writeAudit(event, { userId, email: user.email as string, role }, "auth.passwordChanged");
    }

    return await respond(oid, freshToken);
});

async function respond(oid: ReturnType<typeof toObjectIdOrThrow>, token?: string) {
    const db = await getDatabase();
    const u = await db
        .collection("users")
        .findOne({ _id: oid }, { projection: { password: 0 } });
    if (!u) throw createError({ statusCode: 404, message: "User not found" });
    const role = normalizeRole(u.role);
    const specialty = (u.specialty as ManagerSpecialty | undefined) ?? null;
    return {
        id: u._id.toString(),
        name: u.name as string,
        email: u.email as string,
        role,
        specialty,
        permissions: resolvePermissions(role, specialty),
        avatar: (u.avatar as string | null | undefined) ?? null,
        createdAt: (u.createdAt as Date)?.toISOString?.() ?? "",
        // Present only right after a password change (tokens were revoked).
        ...(token ? { token } : {}),
    };
}
