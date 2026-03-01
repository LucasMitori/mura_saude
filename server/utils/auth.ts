import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { H3Event } from "h3";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, email: string): string {
    const config = useRuntimeConfig();
    return jwt.sign({ userId, email }, config.jwtSecret, {
        expiresIn: "7d",
    });
}

export function verifyToken(token: string): { userId: string; email: string } {
    const config = useRuntimeConfig();
    return jwt.verify(token, config.jwtSecret) as {
        userId: string;
        email: string;
    };
}

export function getAuthUser(event: H3Event): {
    userId: string;
    email: string;
} {
    const authHeader = getHeader(event, "authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw createError({
            statusCode: 401,
            message: "Authentication required",
        });
    }

    const token = authHeader.substring(7);

    try {
        return verifyToken(token);
    } catch {
        throw createError({
            statusCode: 401,
            message: "Invalid or expired token",
        });
    }
}
