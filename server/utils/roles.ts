import type { H3Event } from "h3";
import { getAuthUser } from "#server/utils/auth";
import { getDatabase } from "#server/utils/mongodb";
import { ObjectId } from "mongodb";

export async function requireAdmin(
    event: H3Event,
): Promise<{ userId: string; email: string }> {
    const auth = getAuthUser(event);

    const db = await getDatabase();
    const user = await db
        .collection("users")
        .findOne(
            { _id: new ObjectId(auth.userId) },
            { projection: { role: 1 } },
        );

    if (!user || user.role !== "admin") {
        throw createError({
            statusCode: 403,
            message: "Only admin users can perform this action",
        });
    }

    return auth;
}
