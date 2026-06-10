import { getDatabase } from "#server/utils/mongodb";
import { hashPassword, generateToken } from "#server/utils/auth";
import { validatePassword } from "#server/utils/password-rules";
import { rateLimit } from "#server/utils/rate-limit";
import { validateString } from "#server/utils/validators";
import { resolvePermissions } from "../../../shared/permissions";

interface RegisterBody {
    name?: unknown;
    email?: unknown;
    password?: unknown;
}

export default defineEventHandler(async (event) => {
    rateLimit(event, { key: "register", max: 5, windowMs: 60_000 });

    const body = await readBody<RegisterBody>(event);
    const nameRaw = typeof body?.name === "string" ? body.name : "";
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const passwordRaw = typeof body?.password === "string" ? body.password : "";

    if (!nameRaw || !emailRaw || !passwordRaw) {
        throw createError({
            statusCode: 400,
            message: "Name, email, and password are required",
        });
    }

    const name = validateString(nameRaw, "name", 80).trim();
    const email = validateString(emailRaw, "email", 254).toLowerCase().trim();
    const password = validateString(passwordRaw, "password", 200);

    if (name.length < 2) {
        throw createError({ statusCode: 400, message: "Name is too short" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw createError({
            statusCode: 400,
            message: "Invalid email format",
        });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
        throw createError({
            statusCode: 400,
            message: passwordCheck.errors.join(". "),
        });
    }

    const db = await getDatabase();
    const usersCollection = db.collection("users");

    await usersCollection.createIndex({ email: 1 }, { unique: true }).catch(() => {});

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
        throw createError({
            statusCode: 409,
            message: "Email already registered",
        });
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date();
    // SECURITY: self-registration ALWAYS creates a standard "user". The role is
    // never read from the request body — only an admin can elevate it later.
    const role = "user" as const;

    const result = await usersCollection.insertOne({
        name,
        email,
        password: hashedPassword,
        role,
        specialty: null,
        createdAt: now,
        updatedAt: now,
    });

    const token = generateToken(result.insertedId.toString(), email, role);

    return {
        user: {
            id: result.insertedId.toString(),
            name,
            email,
            role,
            specialty: null,
            permissions: resolvePermissions(role, null),
            createdAt: now.toISOString(),
        },
        token,
    };
});
