import { requirePermission } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { resolvePermissions, normalizeRole } from "../../../../shared/permissions";

// GET /api/admin/users — list all users for the role-management screen.
export default defineEventHandler(async (event) => {
    await requirePermission(event, "users.manage");

    const db = await getDatabase();
    const users = await db
        .collection("users")
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

    return users.map((u) => {
        const role = normalizeRole(u.role);
        const specialty = (u.specialty as "personal_trainer" | "nutritionist" | undefined) ?? null;
        return {
            id: u._id.toString(),
            name: u.name as string,
            email: u.email as string,
            role,
            specialty,
            permissions: resolvePermissions(role, specialty),
            avatar: (u.avatar as string | null | undefined) ?? null,
            createdAt: (u.createdAt as Date)?.toISOString?.() ?? "",
        };
    });
});
