import { requirePermission } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import { EXAM_BUCKET, isPreviewable, callerAudience, normalizeAudience } from "#server/utils/exams";
import type { ExamFile } from "../../../shared/types/exam";

// List exam documents (metadata only — never the binaries). exams.view =
// admin + nutritionist + médico. Non-admins only see documents targeted to
// their profession (audience). Sorted by upload date descending.
export default defineEventHandler(async (event): Promise<ExamFile[]> => {
    const ctx = await requirePermission(event, "exams.view");
    const aud = callerAudience(ctx);

    // admin (aud=null) sees all; others only their targeted documents.
    const filter = aud === null ? {} : { "metadata.audience": aud };

    const db = await getDatabase();
    const files = await db
        .collection(`${EXAM_BUCKET}.files`)
        .find(filter)
        .sort({ uploadDate: -1 })
        .limit(500)
        .toArray();

    return files.map((f) => {
        const m = (f.metadata || {}) as Record<string, unknown>;
        const contentType = (m.contentType as string) || "application/octet-stream";
        return {
            id: f._id.toString(),
            title: (m.title as string) || (f.filename as string) || "Documento",
            category: (m.category as string) || "Outro",
            examDate: (m.examDate as string) || null,
            notes: (m.notes as string) || "",
            originalName: (m.originalName as string) || (f.filename as string) || "arquivo",
            contentType,
            size: (f.length as number) || 0,
            audience: normalizeAudience(m.audience),
            uploadedByName: (m.uploadedByName as string) || "",
            uploadedAt:
                f.uploadDate instanceof Date
                    ? f.uploadDate.toISOString()
                    : new Date(f.uploadDate as string).toISOString(),
            previewable: isPreviewable(contentType),
        };
    });
});
