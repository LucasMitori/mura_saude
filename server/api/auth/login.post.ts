import { getDatabase } from "#server/utils/mongodb";
import { verifyPassword, generateToken } from "#server/utils/auth";
import { rateLimit } from "#server/utils/rate-limit";
import { validateString } from "#server/utils/validators";
import { resolvePermissions, normalizeRole } from "../../../shared/permissions";

interface LoginBody {
    email?: unknown;
    password?: unknown;
}

export default defineEventHandler(async (event) => {
    rateLimit(event, { key: "login", max: 8, windowMs: 60_000 });

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
        throw createError({ statusCode: 401, message: invalidMsg });
    }

    const isValidPassword = await verifyPassword(password, user.password as string);
    if (!isValidPassword) {
        throw createError({ statusCode: 401, message: invalidMsg });
    }

    const role = normalizeRole(user.role);
    const specialty = (user.specialty as "personal_trainer" | "nutritionist" | undefined) ?? null;
    const token = generateToken(user._id.toString(), user.email as string, role);

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
