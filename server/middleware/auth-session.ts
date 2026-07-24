import { ObjectId } from "mongodb";
import { verifyToken } from "#server/utils/auth";
import { getDatabase } from "#server/utils/mongodb";

/**
 * Central session validation for every authenticated API request.
 *
 * Token revocation has to be enforced in ONE place — endpoints that only need
 * identity (e.g. /api/auth/me) used to skip it, which meant a revoked token
 * still worked there. Doing it here makes the control fail-closed: any present
 * and syntactically valid Bearer token is checked against the account's current
 * `tokenVersion`, so a password change or "log out everywhere" kills it
 * everywhere at once.
 *
 * The resolved user document is cached on the event so getAuthContext doesn't
 * repeat the lookup — net cost stays one query per request.
 */
export default defineEventHandler(async (event) => {
    const path = event.path || "";
    if (!path.startsWith("/api/")) return;

    const header = getHeader(event, "authorization");
    if (!header || !header.startsWith("Bearer ")) return; // anonymous: endpoints enforce their own auth

    const token = header.substring(7).trim();
    if (!token) return;

    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        // Malformed/expired token — let the endpoint produce its own 401 so
        // public endpoints keep working when a stale header is sent along.
        return;
    }

    if (!payload?.userId || !/^[a-fA-F0-9]{24}$/.test(payload.userId)) return;

    const db = await getDatabase();
    const user = await db
        .collection("users")
        .findOne(
            { _id: new ObjectId(payload.userId) },
            { projection: { role: 1, specialty: 1, email: 1, tokenVersion: 1 } },
        );

    if (!user) {
        throw createError({ statusCode: 401, message: "User no longer exists" });
    }

    if (Number(payload.tv || 0) !== Number(user.tokenVersion || 0)) {
        throw createError({
            statusCode: 401,
            message: "Sessão expirada — faça login novamente",
        });
    }

    event.context.sessionUser = user;
});
