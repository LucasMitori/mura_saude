import { getDatabase } from "#server/utils/mongodb";
import { hashPassword } from "#server/utils/auth";
import { rateLimit } from "#server/utils/rate-limit";

interface Body {
    secret?: string;
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
    if (!body?.secret || body.secret !== jwtSecret) {
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
