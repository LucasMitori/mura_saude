import { requirePermission } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { writeAudit } from "#server/utils/audit";
import { EXAM_CATEGORIES } from "../../../shared/types/exam";
import {
    getExamBucket,
    sanitizeFilename,
    normalizeAudience,
    MAX_EXAM_BYTES,
    type ExamMetadata,
} from "#server/utils/exams";

// Upload a medical document. exams.edit = admin only.
// Transport is multipart/form-data (no base64 inflation) so larger files fit;
// the binary is streamed into GridFS. A single file per request.
export default defineEventHandler(async (event) => {
    // requirePermission resolves + returns the full auth context (role from DB).
    const ctx = await requirePermission(event, "exams.edit");

    // Guard on the declared body size BEFORE buffering it, to blunt memory DoS.
    const declaredLen = Number(getHeader(event, "content-length") || 0);
    if (declaredLen && declaredLen > MAX_EXAM_BYTES + 1024 * 1024) {
        throw createError({
            statusCode: 413,
            message: "Arquivo excede o limite de 50 MB",
        });
    }

    const parts = await readMultipartFormData(event);
    if (!parts || parts.length === 0) {
        throw createError({ statusCode: 400, message: "Nenhum arquivo enviado" });
    }

    const filePart = parts.find((p) => p.filename && p.data);
    if (!filePart || !filePart.data) {
        throw createError({ statusCode: 400, message: "Arquivo ausente" });
    }
    if (filePart.data.length === 0) {
        throw createError({ statusCode: 400, message: "Arquivo vazio" });
    }
    if (filePart.data.length > MAX_EXAM_BYTES) {
        throw createError({
            statusCode: 413,
            message: "Arquivo excede o limite de 50 MB",
        });
    }

    // Text metadata fields.
    const field = (name: string): string => {
        const p = parts.find((x) => x.name === name && !x.filename);
        return p?.data ? p.data.toString("utf8").slice(0, 2000) : "";
    };
    // All values for a repeated field (the audience multi-select sends one
    // "audience" part per selected professional).
    const multiField = (name: string): string[] =>
        parts
            .filter((x) => x.name === name && !x.filename && x.data)
            .map((x) => x.data.toString("utf8"));

    const originalName = sanitizeFilename(filePart.filename);
    const rawTitle = field("title").trim();
    const category = EXAM_CATEGORIES.includes(field("category") as never)
        ? field("category")
        : "Outro";
    const examDateRaw = field("examDate").trim();
    const examDate = /^\d{4}-\d{2}-\d{2}$/.test(examDateRaw) ? examDateRaw : null;
    const notes = field("notes").trim().slice(0, 2000);
    const audience = normalizeAudience(multiField("audience"));

    // Trust the browser's declared MIME only loosely; it drives inline-vs-download
    // serving, and unsafe types are force-downloaded regardless (see exams util).
    const contentType =
        (typeof filePart.type === "string" && filePart.type.slice(0, 120)) ||
        "application/octet-stream";

    const metadata: ExamMetadata = {
        contentType,
        originalName,
        title: (rawTitle || originalName).slice(0, 200),
        category,
        examDate,
        notes,
        audience,
        uploadedBy: ctx.userId,
        uploadedByName: ctx.email,
        size: filePart.data.length,
    };

    const db = await getDatabase();
    const bucket = getExamBucket(db);

    const id = await new Promise<string>((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(originalName, { metadata });
        uploadStream.on("error", reject);
        uploadStream.on("finish", () => resolve(uploadStream.id.toString()));
        uploadStream.end(filePart.data);
    });

    await writeAudit(
        event,
        { userId: ctx.userId, email: ctx.email, role: ctx.role },
        "exam.upload",
        { examId: id, title: metadata.title, size: metadata.size, audience },
    );

    return { success: true, id, size: metadata.size };
});
