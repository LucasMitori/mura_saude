import { getDatabase } from "#server/utils/mongodb";
import { getAuthUser } from "#server/utils/auth";
import { toObjectIdOrThrow } from "#server/utils/roles";
import { rateLimit } from "#server/utils/rate-limit";
import { writeAudit } from "#server/utils/audit";

// "Sair de todos os dispositivos" — bumps the user's tokenVersion, which
// invalidates EVERY token issued for the account, including the one making
// this call. Use it if a device is lost or a session may be compromised.
export default defineEventHandler(async (event) => {
    rateLimit(event, { key: "logout-all", max: 10, windowMs: 60_000 });

    const { userId, email } = getAuthUser(event);
    const oid = toObjectIdOrThrow(userId, 401);

    const db = await getDatabase();
    const res = await db
        .collection("users")
        .findOneAndUpdate(
            { _id: oid },
            { $inc: { tokenVersion: 1 }, $set: { updatedAt: new Date() } },
            { returnDocument: "after", projection: { tokenVersion: 1 } },
        );

    if (!res) {
        throw createError({ statusCode: 404, message: "Usuário não encontrado" });
    }

    await writeAudit(event, { userId, email }, "auth.logoutAll");

    return { success: true, message: "Todas as sessões foram encerradas" };
});
