import { timingSafeEqual } from "node:crypto";
import { getDatabase } from "#server/utils/mongodb";
import { hashPassword } from "#server/utils/auth";
import { rateLimit } from "#server/utils/rate-limit";

interface Body {
    secret?: string;
}

/** Constant-time compare so the secret can't be recovered byte-by-byte by
 *  timing the response. Length differences are handled without leaking. */
function secretMatches(provided: unknown, expected: unknown): boolean {
    if (typeof provided !== "string" || typeof expected !== "string") return false;
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) {
        // Still burn a comparison so the timing stays flat.
        timingSafeEqual(b, b);
        return false;
    }
    return timingSafeEqual(a, b);
}

export default defineEventHandler(async (event) => {
    rateLimit(event, { key: "seed-admin", max: 3, windowMs: 60_000 });

    const config = useRuntimeConfig();
    const adminUsername = config.adminUsername || "admin";
    const adminEmail = (config.adminEmail || "").toLowerCase().trim();
    const adminPassword = config.adminPassword;
    const jwtSecret = config.jwtSecret;

    if (!adminEmail || !adminPassword) {
        throw createError({
            statusCode: 500,
            message: "ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment to seed admin",
        });
    }

    const body = await readBody<Body>(event);
    if (!secretMatches(body?.secret, jwtSecret)) {
        throw createError({ statusCode: 403, message: "Forbidden" });
    }

    const db = await getDatabase();
    const users = db.collection("users");
    await users.createIndex({ email: 1 }, { unique: true }).catch(() => {});

    const hashed = await hashPassword(adminPassword);
    const now = new Date();

    const result = await users.updateOne(
        { email: adminEmail },
        {
            $set: {
                name: adminUsername,
                email: adminEmail,
                password: hashed,
                role: "admin",
                updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
        },
        { upsert: true },
    );

    return {
        success: true,
        action: result.upsertedCount > 0 ? "created" : "updated",
        email: adminEmail,
        username: adminUsername,
    };
});
