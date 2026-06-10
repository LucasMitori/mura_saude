import { getDatabase } from "#server/utils/mongodb";
import { getAuthUser } from "#server/utils/auth";
import { toObjectIdOrThrow } from "#server/utils/roles";
import { resolvePermissions, normalizeRole } from "../../../shared/permissions";

export default defineEventHandler(async (event) => {
    const { userId } = getAuthUser(event);
    const oid = toObjectIdOrThrow(userId, 401);

    const db = await getDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne(
        { _id: oid },
        { projection: { password: 0 } },
    );

    if (!user) {
        throw createError({ statusCode: 404, message: "User not found" });
    }

    const role = normalizeRole(user.role);
    const specialty = (user.specialty as "personal_trainer" | "nutritionist" | undefined) ?? null;

    return {
        id: user._id.toString(),
        name: user.name as string,
        email: user.email as string,
        role,
        specialty,
        permissions: resolvePermissions(role, specialty),
        avatar: (user.avatar as string | null | undefined) ?? null,
        createdAt: (user.createdAt as Date)?.toISOString?.() ?? "",
    };
});
