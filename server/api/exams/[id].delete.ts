import { requirePermission } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { EXAM_BUCKET, getExamBucket, toObjectId } from "#server/utils/exams";
import { writeAudit } from "#server/utils/audit";

// Delete an exam document (binary + chunks). exams.edit = admin only.
export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "exams.edit");

    const oid = toObjectId(getRouterParam(event, "id") || "");
    if (!oid) {
        throw createError({ statusCode: 400, message: "Identificador inválido" });
    }

    const db = await getDatabase();
    const exists = await db.collection(`${EXAM_BUCKET}.files`).findOne(
        { _id: oid },
        { projection: { _id: 1 } },
    );
    if (!exists) {
        throw createError({ statusCode: 404, message: "Documento não encontrado" });
    }

    // bucket.delete removes both the file doc and its chunks.
    await getExamBucket(db).delete(oid);

    await writeAudit(
        event,
        { userId: ctx.userId, email: ctx.email, role: ctx.role },
        "exam.delete",
        { examId: oid.toString() },
    );

    return { success: true };
});
