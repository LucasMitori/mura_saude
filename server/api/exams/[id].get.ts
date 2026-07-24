import { requirePermission } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import {
    EXAM_BUCKET,
    getExamBucket,
    isPreviewable,
    contentDisposition,
    toObjectId,
    callerAudience,
    normalizeAudience,
} from "#server/utils/exams";
import { writeAudit } from "#server/utils/audit";

// Stream one exam document. exams.view = admin + nutritionist.
// SECURITY: unsafe types are NEVER served inline (they would run scripts in our
// origin) — only PDF/images/plain-text preview inline; everything else, and any
// `?download=1` request, is a forced attachment. Always nosniff + sandbox CSP +
// no-store so these sensitive files don't render as HTML or linger in caches.
export default defineEventHandler(async (event) => {
    const ctx = await requirePermission(event, "exams.view");

    const oid = toObjectId(getRouterParam(event, "id") || "");
    if (!oid) {
        throw createError({ statusCode: 400, message: "Identificador inválido" });
    }

    const db = await getDatabase();
    const fileDoc = await db.collection(`${EXAM_BUCKET}.files`).findOne({ _id: oid });
    if (!fileDoc) {
        throw createError({ statusCode: 404, message: "Documento não encontrado" });
    }

    const meta = (fileDoc.metadata || {}) as Record<string, unknown>;

    // Audience gate: a non-admin professional may only fetch documents targeted
    // to them. Respond 404 (not 403) so we don't reveal that a document exists.
    const aud = callerAudience(ctx);
    if (aud !== null && !normalizeAudience(meta.audience).includes(aud as never)) {
        throw createError({ statusCode: 404, message: "Documento não encontrado" });
    }

    const contentType = (meta.contentType as string) || "application/octet-stream";
    const originalName = (meta.originalName as string) || (fileDoc.filename as string) || "arquivo";

    const forceDownload = getQuery(event).download !== undefined;
    const inline = isPreviewable(contentType) && !forceDownload;

    // Accountability trail: record WHO opened WHICH medical document.
    await writeAudit(
        event,
        { userId: ctx.userId, email: ctx.email, role: ctx.role },
        forceDownload ? "exam.download" : "exam.view",
        { examId: oid.toString(), title: meta.title || originalName },
    );

    // Safe types keep their real content-type for inline rendering; anything
    // else is delivered as an opaque octet-stream download.
    setResponseHeader(event, "Content-Type", inline ? contentType : "application/octet-stream");
    setResponseHeader(event, "Content-Length", fileDoc.length as number);
    setResponseHeader(event, "Content-Disposition", contentDisposition(originalName, inline));
    setResponseHeader(event, "X-Content-Type-Options", "nosniff");
    setResponseHeader(event, "Content-Security-Policy", "default-src 'none'; sandbox;");
    setResponseHeader(event, "Cache-Control", "private, no-store, max-age=0");
    setResponseHeader(event, "Cross-Origin-Resource-Policy", "same-origin");

    const bucket = getExamBucket(db);
    return sendStream(event, bucket.openDownloadStream(oid));
});
