import { requirePermission } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { sanitizeMongoInput } from "#server/utils/validators";
import { EXAM_BUCKET, toObjectId, normalizeAudience } from "#server/utils/exams";
import { EXAM_CATEGORIES } from "../../../shared/types/exam";

interface EditBody {
    title?: unknown;
    category?: unknown;
    examDate?: unknown;
    notes?: unknown;
    audience?: unknown;
}

// Edit an exam's metadata (title/category/date/notes) — not the binary.
// exams.edit = admin only. Fields are mapped explicitly onto metadata.*.
export default defineEventHandler(async (event) => {
    await requirePermission(event, "exams.edit");

    const oid = toObjectId(getRouterParam(event, "id") || "");
    if (!oid) {
        throw createError({ statusCode: 400, message: "Identificador inválido" });
    }

    const body = sanitizeMongoInput(await readBody<EditBody>(event));

    const set: Record<string, unknown> = {};
    if (typeof body.title === "string") {
        set["metadata.title"] = body.title.trim().slice(0, 200) || "Documento";
    }
    if (typeof body.category === "string" && EXAM_CATEGORIES.includes(body.category as never)) {
        set["metadata.category"] = body.category;
    }
    if (typeof body.examDate === "string") {
        set["metadata.examDate"] = /^\d{4}-\d{2}-\d{2}$/.test(body.examDate)
            ? body.examDate
            : null;
    }
    if (typeof body.notes === "string") {
        set["metadata.notes"] = body.notes.slice(0, 2000);
    }
    if (body.audience !== undefined) {
        set["metadata.audience"] = normalizeAudience(body.audience);
    }

    if (Object.keys(set).length === 0) {
        throw createError({ statusCode: 400, message: "Nada para atualizar" });
    }

    const db = await getDatabase();
    const res = await db
        .collection(`${EXAM_BUCKET}.files`)
        .updateOne({ _id: oid }, { $set: set });
    if (res.matchedCount === 0) {
        throw createError({ statusCode: 404, message: "Documento não encontrado" });
    }

    return { success: true };
});
