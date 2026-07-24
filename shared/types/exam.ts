// ===== EXAMS / RESULTADOS =====
// Medical documents (blood work, imaging, prescriptions, reports) uploaded by
// the admin/patient. Binaries live in GridFS (bucket "exams"); this is the
// metadata the list/cards render. SENSITIVE — only admin (exams.edit) and
// nutritionist (exams.view) can access; never normal users.

export const EXAM_CATEGORIES = [
    "Exame de Sangue",
    "Bioimpedância",
    "Imagem / Raio-X",
    "Receita / Prescrição",
    "Laudo Médico",
    "Outro",
] as const;

export type ExamCategory = (typeof EXAM_CATEGORIES)[number];

// Which professional(s) a document is meant for. The admin picks this per
// upload; a médico only sees documents whose audience includes "medico", a
// nutricionista only "nutritionist". The admin (owner) always sees everything.
// Values intentionally match the ManagerSpecialty strings so the server can
// filter by the caller's specialty with no mapping.
export const EXAM_AUDIENCES = ["medico", "nutritionist"] as const;
export type ExamAudience = (typeof EXAM_AUDIENCES)[number];

export const EXAM_AUDIENCE_LABELS: Record<ExamAudience, string> = {
    medico: "Médico",
    nutritionist: "Nutricionista",
};

export interface ExamFile {
    id: string;
    title: string;
    category: string;
    examDate: string | null; // YYYY-MM-DD of the exam itself (optional)
    notes: string;
    originalName: string;
    contentType: string;
    size: number; // bytes
    uploadedByName: string;
    uploadedAt: string; // ISO
    // Professionals this document is targeted to (subset of EXAM_AUDIENCES).
    audience: ExamAudience[];
    // True when the browser can safely preview it inline (PDF / image / text).
    previewable: boolean;
}
