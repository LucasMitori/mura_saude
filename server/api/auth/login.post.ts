import { getDatabase } from "#server/utils/mongodb";
import { verifyPassword, generateToken } from "#server/utils/auth";

interface LoginBody {
    email: string;
    password: string;
}

export default defineEventHandler(async (event) => {
    const body = await readBody<LoginBody>(event);
    const { email, password } = body;

    if (!email || !password) {
        throw createError({
            statusCode: 400,
            message: "Email and password are required",
        });
    }

    const db = await getDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({
        email: email.toLowerCase().trim(),
    });

    if (!user) {
        throw createError({
            statusCode: 401,
            message: "Invalid email or password",
        });
    }

    const isValidPassword = await verifyPassword(
        password,
        user.password as string,
    );
    if (!isValidPassword) {
        throw createError({
            statusCode: 401,
            message: "Invalid email or password",
        });
    }

    const token = generateToken(user._id.toString(), user.email as string);

    return {
        user: {
            id: user._id.toString(),
            name: user.name as string,
            email: user.email as string,
            role: (user.role as string) || "viewer",
            createdAt: (user.createdAt as Date)?.toISOString?.() ?? "",
        },
        token,
    };
});
