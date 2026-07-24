import { getDatabase } from "#server/utils/mongodb";
import { verifyPassword, generateToken } from "#server/utils/auth";
import { rateLimit } from "#server/utils/rate-limit";
import { validateString } from "#server/utils/validators";
import { writeAudit } from "#server/utils/audit";
import { resolvePermissions, normalizeRole } from "../../../shared/permissions";
import type { ManagerSpecialty } from "../../../shared/types/auth";

interface LoginBody {
    email?: unknown;
    password?: unknown;
}

// Per-ACCOUNT brute-force lockout. The IP rate limit above is the first line of
// defence, but it is per-instance and per-IP — an attacker rotating IPs (or
// hitting different serverless instances) slips past it. This counter lives on
// the user document, so it holds globally no matter where the request lands.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export default defineEventHandler(async (event) => {
    // Per-IP ceiling (first line of defence). The per-account lockout below is
    // the one that actually stops a targeted attack, so this can stay generous
    // enough not to punish a legitimate user retrying a typo'd password.
    rateLimit(event, { key: "login", max: 12, windowMs: 60_000 });

    const body = await readBody<LoginBody>(event);
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const passwordRaw = typeof body?.password === "string" ? body.password : "";

    if (!emailRaw || !passwordRaw) {
        throw createError({
            statusCode: 400,
            message: "Email and password are required",
        });
    }

    const email = validateString(emailRaw, "email", 254).toLowerCase().trim();
    const password = validateString(passwordRaw, "password", 200);

    const db = await getDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ email });

    const invalidMsg = "Invalid email or password";

    if (!user) {
        // Time-equalize against valid-user path
        await verifyPassword(password, "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsa").catch(() => {});
        await writeAudit(event, { email }, "auth.login.failed", { reason: "unknown-email" });
        throw createError({ statusCode: 401, message: invalidMsg });
    }

    const now = new Date();
    const lockedUntil = user.lockedUntil instanceof Date ? user.lockedUntil : null;
    if (lockedUntil && lockedUntil > now) {
        const retryAfter = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
        await writeAudit(event, { userId: user._id.toString(), email }, "auth.login.locked", {
            retryAfterSeconds: retryAfter,
        });
        setResponseHeader(event, "Retry-After", String(retryAfter));
        throw createError({
            statusCode: 429,
            message: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${Math.ceil(retryAfter / 60)} min.`,
        });
    }

    const isValidPassword = await verifyPassword(password, user.password as string);
    if (!isValidPassword) {
        const failed = Number(user.failedLoginAttempts || 0) + 1;
        const update: Record<string, unknown> =
            failed >= MAX_FAILED_ATTEMPTS
                ? {
                      // Lock, and reset the counter so a fresh set of attempts
                      // is available once the lock expires.
                      failedLoginAttempts: 0,
                      lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000),
                  }
                : { failedLoginAttempts: failed };
        await usersCollection.updateOne({ _id: user._id }, { $set: update });
        await writeAudit(event, { userId: user._id.toString(), email }, "auth.login.failed", {
            reason: "bad-password",
            attempt: failed,
            locked: failed >= MAX_FAILED_ATTEMPTS,
        });
        throw createError({ statusCode: 401, message: invalidMsg });
    }

    // Success — clear the failure state.
    await usersCollection.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now } },
    );

    const role = normalizeRole(user.role);
    const specialty = (user.specialty as ManagerSpecialty | undefined) ?? null;
    const token = generateToken(
        user._id.toString(),
        user.email as string,
        role,
        Number(user.tokenVersion || 0),
    );

    await writeAudit(event, { userId: user._id.toString(), email, role }, "auth.login.success");

    return {
        user: {
            id: user._id.toString(),
            name: user.name as string,
            email: user.email as string,
            role,
            specialty,
            permissions: resolvePermissions(role, specialty),
            avatar: (user.avatar as string | null | undefined) ?? null,
            createdAt: (user.createdAt as Date)?.toISOString?.() ?? "",
        },
        token,
    };
});
