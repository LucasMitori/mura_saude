import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { H3Event } from "h3";

const SALT_ROUNDS = 12;
const TOKEN_TTL: SignOptions["expiresIn"] = "7d";

function requireJwtSecret(): string {
    const config = useRuntimeConfig();
    const secret = config.jwtSecret;
    if (!secret || typeof secret !== "string" || secret.length < 32) {
        throw createError({
            statusCode: 500,
            message: "Server misconfigured: JWT_SECRET is missing or too weak",
        });
    }
    return secret;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, email: string, role: string): string {
    return jwt.sign({ userId, email, role }, requireJwtSecret(), {
        expiresIn: TOKEN_TTL,
        issuer: "mura-saude",
    });
}

export interface AuthPayload {
    userId: string;
    email: string;
    role?: string;
}

export function verifyToken(token: string): AuthPayload {
    return jwt.verify(token, requireJwtSecret(), { issuer: "mura-saude" }) as AuthPayload;
}

export function getAuthUser(event: H3Event): AuthPayload {
    const authHeader = getHeader(event, "authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw createError({
            statusCode: 401,
            message: "Authentication required",
        });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
        throw createError({ statusCode: 401, message: "Authentication required" });
    }

    try {
        return verifyToken(token);
    } catch {
        throw createError({
            statusCode: 401,
            message: "Invalid or expired token",
        });
    }
}
