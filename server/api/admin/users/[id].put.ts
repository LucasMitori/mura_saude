import { requirePermission, toObjectIdOrThrow } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { sanitizeMongoInput } from "#server/utils/validators";
import { resolvePermissions } from "../../../../shared/permissions";

const ROLES = ["admin", "manager", "user"];
const SPECIALTIES = ["personal_trainer", "nutritionist"];

// PUT /api/admin/users/:id  body: { role, specialty? } — change a user's role.
// users.manage permission required (admin only). The role is the ONLY way to
// elevate privileges, and it's gated + guarded here on the server.
export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "users.manage");
    const id = toObjectIdOrThrow(getRouterParam(event, "id") || "");

    const body = sanitizeMongoInput(await readBody<{ role?: unknown; specialty?: unknown }>(event));

    const role = body.role;
    if (typeof role !== "string" || !ROLES.includes(role)) {
        throw createError({ statusCode: 400, message: "Papel (role) inválido" });
    }

    let specialty: "personal_trainer" | "nutritionist" | null = null;
    if (role === "manager") {
        if (typeof body.specialty !== "string" || !SPECIALTIES.includes(body.specialty)) {
            throw createError({
                statusCode: 400,
                message: "Selecione a especialidade do manager (personal trainer ou nutricionista)",
            });
        }
        specialty = body.specialty as "personal_trainer" | "nutritionist";
    }

    // Guard: an admin can't change their own role (prevents self-lockout).
    if (id.toString() === ctx.userId) {
        throw createError({ statusCode: 400, message: "Você não pode alterar o seu próprio papel" });
    }

    const db = await getDatabase();
    const users = db.collection("users");
    const target = await users.findOne({ _id: id }, { projection: { role: 1 } });
    if (!target) {
        throw createError({ statusCode: 404, message: "Usuário não encontrado" });
    }

    // Guard: never demote the last remaining admin.
    if (target.role === "admin" && role !== "admin") {
        const adminCount = await users.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
            throw createError({ statusCode: 400, message: "Não é possível remover o único admin do sistema" });
        }
    }

    await users.updateOne(
        { _id: id },
        { $set: { role, specialty, updatedAt: new Date() } },
    );

    return { success: true, role, specialty, permissions: resolvePermissions(role, specialty) };
});
