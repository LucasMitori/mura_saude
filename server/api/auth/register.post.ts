import { getDatabase } from "#server/utils/mongodb";
import { hashPassword, generateToken } from "#server/utils/auth";
import { validatePassword } from "#server/utils/password-rules";

interface RegisterBody {
    name: string;
    email: string;
    password: string;
}

const ADMIN_EMAIL = "admin@admin.com";

export default defineEventHandler(async (event) => {
    const body = await readBody<RegisterBody>(event);
    const { name, email, password } = body;

    if (!name || !email || !password) {
        throw createError({
            statusCode: 400,
            message: "Name, email, and password are required",
        });
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

    const existingUser = await usersCollection.findOne({
        email: email.toLowerCase(),
    });
    if (existingUser) {
        throw createError({
            statusCode: 409,
            message: "Email already registered",
        });
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date();
    const role =
        email.toLowerCase().trim() === ADMIN_EMAIL ? "admin" : "viewer";

    const result = await usersCollection.insertOne({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        createdAt: now,
        updatedAt: now,
    });

    const token = generateToken(
        result.insertedId.toString(),
        email.toLowerCase(),
    );

    return {
        user: {
            id: result.insertedId.toString(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            role,
            createdAt: now.toISOString(),
        },
        token,
    };
});
