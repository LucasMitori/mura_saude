import { GridFSBucket, ObjectId, type Db } from "mongodb";
import type { AuthContext } from "#server/utils/roles";
import { EXAM_AUDIENCES, type ExamAudience } from "../../shared/types/exam";

export const EXAM_BUCKET = "exams";

// Hard cap on a single file. GridFS itself has no limit, but we buffer the
// upload in memory, so cap it to avoid memory-exhaustion DoS. (On Vercel the
// platform caps request bodies at ~4.5 MB regardless — documented in README.)
export const MAX_EXAM_BYTES = 50 * 1024 * 1024; // 50 MB

// Types the browser can render inline WITHOUT script-execution risk. Everything
// else (svg, html, office docs, zips, dicom, …) is served as a forced download.
// This is the core defense: a malicious uploaded .html/.svg must never run in
// our origin, so it is only ever delivered as an attachment.
const INLINE_SAFE_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "text/plain",
]);

export function isPreviewable(contentType: string): boolean {
    return INLINE_SAFE_TYPES.has((contentType || "").toLowerCase());
}

export function getExamBucket(db: Db): GridFSBucket {
    return new GridFSBucket(db, { bucketName: EXAM_BUCKET });
}

export interface ExamMetadata {
    contentType: string;
    originalName: string;
    title: string;
    category: string;
    examDate: string | null;
    notes: string;
    audience: ExamAudience[];
    uploadedBy: string;
    uploadedByName: string;
    size: number;
}

// Control chars to strip from filenames before echoing them back in headers.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\"]", "g");
const NON_ASCII = new RegExp("[^\\u0020-\\u007e]", "g");

/** Strip control chars / quotes / path separators from a client filename so it
 *  is safe to echo back in a Content-Disposition header and as a title. */
export function sanitizeFilename(name: unknown): string {
    const raw = typeof name === "string" ? name : "arquivo";
    return (
        raw
            .replace(CONTROL_CHARS, "")
            .replace(/[/\\]/g, "_")
            .trim()
            .slice(0, 200) || "arquivo"
    );
}

/** RFC 5987 Content-Disposition value with an ASCII fallback + UTF-8 form. */
export function contentDisposition(name: string, inline: boolean): string {
    const clean = sanitizeFilename(name);
    const ascii = clean.replace(NON_ASCII, "_");
    const encoded = encodeURIComponent(clean);
    const kind = inline ? "inline" : "attachment";
    return `${kind}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export function toObjectId(id: string): ObjectId | null {
    return /^[a-fA-F0-9]{24}$/.test(id) ? new ObjectId(id) : null;
}

// ===== Audience targeting =====

/** Keep only valid audience values; default to BOTH when nothing valid was
 *  provided, so a document is never accidentally invisible to everyone. */
export function normalizeAudience(values: unknown): ExamAudience[] {
    const arr = Array.isArray(values) ? values : [values];
    const valid = arr.filter((v): v is ExamAudience =>
        EXAM_AUDIENCES.includes(v as ExamAudience),
    );
    const unique = [...new Set(valid)];
    return unique.length > 0 ? unique : [...EXAM_AUDIENCES];
}

/**
 * The audience key that gates which documents a caller may see:
 *  - admin  → null  (sees EVERYTHING, no filter)
 *  - manager+medico       → "medico"
 *  - manager+nutritionist → "nutritionist"
 *  - anyone else → "__none__" (matches no document; exams.view already blocks
 *    them, this is defense in depth)
 */
export function callerAudience(ctx: AuthContext): ExamAudience | "__none__" | null {
    if (ctx.role === "admin") return null;
    if (ctx.role === "manager") {
        if (ctx.specialty === "medico") return "medico";
        if (ctx.specialty === "nutritionist") return "nutritionist";
    }
    return "__none__";
}
