import { $fetch } from "ofetch";
import type { ExamFile, ExamAudience } from "#shared/types/exam";
import { useAuthStore } from "~/stores/auth.store";

export interface ExamUploadFields {
    title: string;
    category: string;
    examDate: string | null;
    notes: string;
    audience: ExamAudience[];
}

// Exam binaries require an Authorization header, so previews can't be plain
// <img>/<iframe src> URLs — they're fetched as blobs and exposed as object
// URLs, cached per id for the session (a file is immutable once uploaded).
const objectUrlCache = new Map<string, Promise<string>>();

export function useExams() {
    const authStore = useAuthStore();
    function headers() {
        return authStore.authHeaders;
    }

    async function listExams(): Promise<ExamFile[]> {
        return await $fetch<ExamFile[]>("/api/exams", { headers: headers() });
    }

    async function uploadExam(file: File, fields: ExamUploadFields) {
        const form = new FormData();
        form.append("file", file, file.name);
        form.append("title", fields.title);
        form.append("category", fields.category);
        if (fields.examDate) form.append("examDate", fields.examDate);
        form.append("notes", fields.notes);
        // One "audience" part per selected professional.
        for (const a of fields.audience) form.append("audience", a);
        return await $fetch<{ success: boolean; id: string; size: number }>(
            "/api/exams",
            { method: "POST", body: form, headers: headers() },
        );
    }

    async function updateExam(id: string, fields: Partial<ExamUploadFields>) {
        return await $fetch<{ success: boolean }>(`/api/exams/${id}`, {
            method: "PUT",
            body: fields,
            headers: headers(),
        });
    }

    async function deleteExam(id: string) {
        return await $fetch<{ success: boolean }>(`/api/exams/${id}`, {
            method: "DELETE",
            headers: headers(),
        });
    }

    /** Blob object URL for inline preview (PDF/image). Cached per id. */
    function getPreviewUrl(id: string): Promise<string> {
        let cached = objectUrlCache.get(id);
        if (!cached) {
            cached = $fetch<Blob>(`/api/exams/${id}`, {
                responseType: "blob",
                headers: headers(),
            }).then((blob) => URL.createObjectURL(blob));
            cached.catch(() => objectUrlCache.delete(id));
            objectUrlCache.set(id, cached);
        }
        return cached;
    }

    /** Trigger a browser download (forced attachment via ?download=1). */
    async function downloadExam(exam: ExamFile) {
        const blob = await $fetch<Blob>(`/api/exams/${exam.id}?download=1`, {
            responseType: "blob",
            headers: headers(),
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exam.originalName || exam.title || "documento";
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revoke after the click has a chance to start the download.
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    function forgetPreview(id: string) {
        objectUrlCache.delete(id);
    }

    return {
        listExams,
        uploadExam,
        updateExam,
        deleteExam,
        getPreviewUrl,
        downloadExam,
        forgetPreview,
    };
}
