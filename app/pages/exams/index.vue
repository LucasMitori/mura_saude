<template>
    <div class="exams-page">
        <div class="d-flex align-center mb-4 flex-wrap ga-2">
            <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold d-flex align-center">
                    <v-icon size="28" color="primary" class="mr-2">mdi-file-document-multiple</v-icon>
                    Exames &amp; Resultados
                </h1>
                <p class="text-body-2 text-grey mb-0">
                    {{
                        canEdit
                            ? "Central de documentos médicos — envie, escolha quem pode ver (médico e/ou nutricionista), visualize e organize exames, laudos e resultados."
                            : "Documentos médicos do paciente marcados para você. Você pode visualizar e baixar."
                    }}
                </p>
            </div>
            <v-spacer />
            <v-btn
                v-if="canEdit"
                color="primary"
                variant="flat"
                prepend-icon="mdi-upload"
                @click="openUpload"
            >
                Enviar Documento
            </v-btn>
        </div>

        <!-- Sensitive-data notice -->
        <v-alert
            type="info"
            variant="tonal"
            density="compact"
            icon="mdi-shield-lock"
            class="mb-4"
        >
            <span class="text-caption">
                Documentos sensíveis — cada arquivo é visível apenas para o
                administrador e para os profissionais escolhidos (médico e/ou
                nutricionista). Os arquivos são servidos de forma protegida
                (sem cache, sem execução de scripts) e nunca ficam públicos.
            </span>
        </v-alert>

        <!-- Storage summary + category filter -->
        <div class="d-flex align-center flex-wrap ga-2 mb-3">
            <v-chip variant="tonal" color="primary">
                <v-icon start size="16">mdi-file-multiple</v-icon>
                {{ exams.length }} {{ exams.length === 1 ? "documento" : "documentos" }}
            </v-chip>
            <v-chip variant="tonal" color="info">
                <v-icon start size="16">mdi-database</v-icon>
                {{ formatBytes(totalBytes) }}
            </v-chip>
            <v-spacer />
            <v-chip-group
                v-model="categoryFilter"
                selected-class="text-primary"
                mandatory
            >
                <v-chip value="all" size="small" variant="outlined">Todos</v-chip>
                <v-chip
                    v-for="cat in usedCategories"
                    :key="cat"
                    :value="cat"
                    size="small"
                    variant="outlined"
                >
                    {{ cat }}
                </v-chip>
            </v-chip-group>
        </div>

        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

        <div v-if="loading && exams.length === 0" class="text-center py-10">
            <v-progress-circular indeterminate color="primary" size="64" />
        </div>

        <v-alert v-else-if="exams.length === 0" type="info" variant="tonal">
            Nenhum documento enviado ainda.
            <template v-if="canEdit">
                Clique em "Enviar Documento" para adicionar exames em PDF, imagens
                ou outros formatos.
            </template>
        </v-alert>

        <v-row v-else>
            <v-col
                v-for="exam in filteredExams"
                :key="exam.id"
                cols="12"
                sm="6"
                md="4"
                lg="3"
            >
                <v-card variant="outlined" class="exam-card h-100 d-flex flex-column">
                    <div
                        class="exam-thumb d-flex align-center justify-center"
                        :style="{ background: fileTint(exam.contentType) }"
                        @click="openPreview(exam)"
                    >
                        <v-icon :color="fileColor(exam.contentType)" size="52">
                            {{ fileIcon(exam.contentType) }}
                        </v-icon>
                        <v-chip
                            v-if="exam.previewable"
                            size="x-small"
                            class="exam-thumb__badge"
                            color="surface"
                        >
                            <v-icon start size="12">mdi-eye</v-icon>
                            Pré-visualizar
                        </v-chip>
                    </div>
                    <v-card-text class="flex-grow-1 pb-2">
                        <p class="text-body-2 font-weight-bold mb-1 exam-title" :title="exam.title">
                            {{ exam.title }}
                        </p>
                        <div class="d-flex flex-wrap ga-1 mb-2">
                            <v-chip size="x-small" variant="tonal" color="primary">
                                {{ exam.category }}
                            </v-chip>
                            <v-chip v-if="exam.examDate" size="x-small" variant="outlined">
                                <v-icon start size="11">mdi-calendar</v-icon>
                                {{ formatDate(exam.examDate) }}
                            </v-chip>
                        </div>
                        <!-- Audience targeting — only the admin needs to see who each
                             document is shared with (medic vs nutritionist). -->
                        <div v-if="canEdit" class="d-flex flex-wrap ga-1 mb-2">
                            <v-chip
                                v-for="a in exam.audience"
                                :key="a"
                                size="x-small"
                                variant="tonal"
                                :color="a === 'medico' ? 'teal' : 'green'"
                            >
                                <v-icon start size="11">
                                    {{ a === "medico" ? "mdi-stethoscope" : "mdi-food-apple" }}
                                </v-icon>
                                {{ audienceLabel(a) }}
                            </v-chip>
                        </div>
                        <p v-if="exam.notes" class="text-caption text-medium-emphasis exam-notes mb-1">
                            {{ exam.notes }}
                        </p>
                        <p class="text-caption text-grey mb-0">
                            {{ formatBytes(exam.size) }} · {{ formatUpdated(exam.uploadedAt) }}
                        </p>
                    </v-card-text>
                    <v-divider />
                    <v-card-actions class="pa-2">
                        <v-btn
                            size="small"
                            variant="text"
                            prepend-icon="mdi-eye"
                            @click="openPreview(exam)"
                        >
                            Ver
                        </v-btn>
                        <v-btn
                            size="small"
                            variant="text"
                            icon="mdi-download"
                            title="Baixar"
                            @click="download(exam)"
                        />
                        <v-spacer />
                        <template v-if="canEdit">
                            <v-btn
                                size="small"
                                variant="text"
                                icon="mdi-pencil"
                                title="Editar dados"
                                @click="openEdit(exam)"
                            />
                            <v-btn
                                size="small"
                                variant="text"
                                color="error"
                                icon="mdi-delete"
                                title="Excluir"
                                @click="confirmDelete(exam)"
                            />
                        </template>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>

        <!-- ===== UPLOAD DIALOG ===== -->
        <v-dialog v-model="upload.show" max-width="640" persistent>
            <v-card>
                <v-card-title class="d-flex align-center pa-4">
                    <v-icon start color="primary">mdi-upload</v-icon>
                    Enviar Documento
                    <v-spacer />
                    <v-btn icon="mdi-close" variant="text" @click="upload.show = false" />
                </v-card-title>
                <v-divider />
                <v-card-text>
                    <v-file-input
                        v-model="upload.file"
                        label="Arquivo (PDF, imagem ou outro) *"
                        prepend-icon=""
                        prepend-inner-icon="mdi-paperclip"
                        variant="outlined"
                        show-size
                        :error-messages="upload.fileError ? [upload.fileError] : []"
                        @update:model-value="onFilePicked"
                    />
                    <v-text-field
                        v-model="upload.title"
                        label="Título *"
                        prepend-inner-icon="mdi-format-title"
                        placeholder="Ex: Hemograma completo — jan/2026"
                    />
                    <v-row density="compact">
                        <v-col cols="12" sm="6">
                            <v-select
                                v-model="upload.category"
                                :items="categories"
                                label="Categoria"
                                prepend-inner-icon="mdi-shape"
                            />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <AppDateField
                                v-model="upload.examDate"
                                label="Data do exame"
                                variant="outlined"
                                prepend-inner-icon="mdi-calendar"
                                clearable
                            />
                        </v-col>
                    </v-row>
                    <div class="mb-2">
                        <p class="text-caption text-medium-emphasis mb-1">
                            <v-icon size="14" class="mr-1">mdi-account-eye</v-icon>
                            Compartilhar com — quem pode ver este documento:
                        </p>
                        <v-chip-group
                            v-model="upload.audience"
                            multiple
                            column
                            selected-class="text-primary"
                        >
                            <v-chip
                                v-for="opt in audienceOptions"
                                :key="opt.value"
                                :value="opt.value"
                                filter
                                variant="outlined"
                            >
                                {{ opt.label }}
                            </v-chip>
                        </v-chip-group>
                        <p class="text-caption text-grey mb-0">
                            Você (admin) sempre vê todos os documentos.
                        </p>
                    </div>

                    <v-textarea
                        v-model="upload.notes"
                        label="Observações"
                        rows="2"
                        prepend-inner-icon="mdi-note-text-outline"
                    />
                    <v-alert type="info" variant="tonal" density="compact" class="mt-1">
                        <span class="text-caption">
                            Limite de 50&nbsp;MB por arquivo. Em produção (Vercel),
                            arquivos acima de ~4,5&nbsp;MB podem não subir — nesse
                            caso use um arquivo menor.
                        </span>
                    </v-alert>
                </v-card-text>
                <v-divider />
                <v-card-actions class="pa-4 ga-3">
                    <v-btn variant="outlined" size="large" @click="upload.show = false">
                        Cancelar
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        variant="flat"
                        size="large"
                        prepend-icon="mdi-upload"
                        :loading="upload.saving"
                        :disabled="!upload.file || !upload.title.trim()"
                        @click="submitUpload"
                    >
                        Enviar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ===== EDIT METADATA DIALOG ===== -->
        <v-dialog v-model="edit.show" max-width="560">
            <v-card v-if="edit.exam">
                <v-card-title class="pa-4">
                    <v-icon start color="primary">mdi-pencil</v-icon>
                    Editar Documento
                </v-card-title>
                <v-divider />
                <v-card-text>
                    <v-text-field
                        v-model="edit.title"
                        label="Título"
                        prepend-inner-icon="mdi-format-title"
                    />
                    <v-row density="compact">
                        <v-col cols="12" sm="6">
                            <v-select v-model="edit.category" :items="categories" label="Categoria" />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <AppDateField
                                v-model="edit.examDate"
                                label="Data do exame"
                                variant="outlined"
                                clearable
                            />
                        </v-col>
                    </v-row>
                    <div class="mb-1">
                        <p class="text-caption text-medium-emphasis mb-1">
                            <v-icon size="14" class="mr-1">mdi-account-eye</v-icon>
                            Compartilhar com:
                        </p>
                        <v-chip-group
                            v-model="edit.audience"
                            multiple
                            column
                            selected-class="text-primary"
                        >
                            <v-chip
                                v-for="opt in audienceOptions"
                                :key="opt.value"
                                :value="opt.value"
                                filter
                                variant="outlined"
                            >
                                {{ opt.label }}
                            </v-chip>
                        </v-chip-group>
                    </div>
                    <v-textarea v-model="edit.notes" label="Observações" rows="2" />
                </v-card-text>
                <v-divider />
                <v-card-actions class="pa-4">
                    <v-spacer />
                    <v-btn variant="text" @click="edit.show = false">Cancelar</v-btn>
                    <v-btn color="primary" variant="flat" :loading="edit.saving" @click="submitEdit">
                        Salvar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ===== PREVIEW DIALOG ===== -->
        <v-dialog v-model="preview.show" max-width="1000" scrollable>
            <v-card v-if="preview.exam" class="preview-card">
                <v-card-title class="d-flex align-center pa-3">
                    <v-icon start :color="fileColor(preview.exam.contentType)">
                        {{ fileIcon(preview.exam.contentType) }}
                    </v-icon>
                    <span class="text-body-1 text-truncate">{{ preview.exam.title }}</span>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        size="small"
                        prepend-icon="mdi-download"
                        @click="download(preview.exam)"
                    >
                        Baixar
                    </v-btn>
                    <v-btn icon="mdi-close" variant="text" @click="closePreview" />
                </v-card-title>
                <v-divider />
                <v-card-text class="preview-body pa-0">
                    <div v-if="preview.loading" class="text-center py-10">
                        <v-progress-circular indeterminate color="primary" size="56" />
                    </div>
                    <template v-else-if="preview.url && preview.kind === 'pdf'">
                        <iframe
                            :src="preview.url"
                            class="preview-frame"
                            title="Pré-visualização do PDF"
                        />
                    </template>
                    <template v-else-if="preview.url && preview.kind === 'image'">
                        <div class="d-flex justify-center pa-3">
                            <v-img :src="preview.url" max-height="70vh" contain eager />
                        </div>
                    </template>
                    <div v-else class="text-center py-10 px-4">
                        <v-icon size="64" color="grey">mdi-file-eye-outline</v-icon>
                        <p class="text-body-1 mt-3 mb-1">
                            Este formato não pode ser pré-visualizado com segurança
                            no navegador.
                        </p>
                        <p class="text-caption text-medium-emphasis mb-4">
                            {{ preview.exam.originalName }} · {{ formatBytes(preview.exam.size) }}
                        </p>
                        <v-btn
                            color="primary"
                            variant="flat"
                            prepend-icon="mdi-download"
                            @click="download(preview.exam)"
                        >
                            Baixar para abrir
                        </v-btn>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- Confirm delete -->
        <v-dialog v-model="confirmDialog.show" max-width="440">
            <v-card>
                <v-card-title>Excluir documento?</v-card-title>
                <v-card-text>
                    "{{ confirmDialog.name }}" será excluído permanentemente do
                    banco de dados. Esta ação não pode ser desfeita.
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="confirmDialog.show = false">Cancelar</v-btn>
                    <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDialog.onConfirm">
                        Excluir
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            timeout="3500"
            location="bottom"
        >
            {{ snackbar.message }}
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ExamFile, ExamAudience } from "#shared/types/exam";
import { EXAM_CATEGORIES, EXAM_AUDIENCES, EXAM_AUDIENCE_LABELS } from "#shared/types/exam";
import { formatBytes } from "#shared/meal-images";
import { useAuthStore } from "~/stores/auth.store";

definePageMeta({ requiresPermission: "exams.view" });

const authStore = useAuthStore();
const { listExams, uploadExam, updateExam, deleteExam, getPreviewUrl, downloadExam, forgetPreview } =
    useExams();

const canEdit = computed(() => authStore.can("exams.edit"));
const categories = [...EXAM_CATEGORIES];
const audienceOptions = EXAM_AUDIENCES.map((value) => ({
    value,
    label: EXAM_AUDIENCE_LABELS[value],
}));
function audienceLabel(a: string): string {
    return EXAM_AUDIENCE_LABELS[a as ExamAudience] || a;
}

const exams = ref<ExamFile[]>([]);
const loading = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);
const categoryFilter = ref<string>("all");

const snackbar = ref({ show: false, message: "", color: "success" });
function notify(message: string, color: "success" | "error" = "success") {
    snackbar.value = { show: true, message, color };
}

const totalBytes = computed(() => exams.value.reduce((s, e) => s + e.size, 0));
const usedCategories = computed(() => {
    const set = new Set(exams.value.map((e) => e.category));
    return categories.filter((c) => set.has(c));
});
const filteredExams = computed(() =>
    categoryFilter.value === "all"
        ? exams.value
        : exams.value.filter((e) => e.category === categoryFilter.value),
);

function isPdf(type: string) {
    return type === "application/pdf";
}
function isImage(type: string) {
    return type.startsWith("image/") && type !== "image/svg+xml";
}
function fileIcon(type: string): string {
    if (isPdf(type)) return "mdi-file-pdf-box";
    if (isImage(type)) return "mdi-file-image";
    if (type.includes("word") || type.includes("document")) return "mdi-file-word-box";
    if (type.includes("sheet") || type.includes("excel")) return "mdi-file-excel-box";
    if (type.includes("zip") || type.includes("compressed")) return "mdi-folder-zip";
    return "mdi-file-document-outline";
}
function fileColor(type: string): string {
    if (isPdf(type)) return "red";
    if (isImage(type)) return "blue";
    if (type.includes("word") || type.includes("document")) return "indigo";
    if (type.includes("sheet") || type.includes("excel")) return "green";
    return "blue-grey";
}
function fileTint(type: string): string {
    const map: Record<string, string> = {
        red: "rgba(239,83,80,0.10)",
        blue: "rgba(66,165,245,0.10)",
        indigo: "rgba(92,107,192,0.10)",
        green: "rgba(102,187,106,0.10)",
        "blue-grey": "rgba(120,144,156,0.10)",
    };
    return map[fileColor(type)] || "rgba(120,144,156,0.08)";
}

function formatDate(d: string): string {
    try {
        return format(parseISO(d), "dd/MM/yyyy");
    } catch {
        return d;
    }
}
function formatUpdated(iso: string): string {
    try {
        return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ptBR });
    } catch {
        return iso;
    }
}

async function load() {
    loading.value = true;
    error.value = null;
    try {
        exams.value = await listExams();
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        error.value = err?.data?.message || err?.message || "Erro ao carregar documentos";
    } finally {
        loading.value = false;
    }
}

// ===== Upload =====
const upload = ref({
    show: false,
    file: null as File | null,
    fileError: null as string | null,
    title: "",
    category: "Outro" as string,
    examDate: null as string | null,
    notes: "",
    audience: [...EXAM_AUDIENCES] as ExamAudience[],
    saving: false,
});

function openUpload() {
    upload.value = {
        show: true,
        file: null,
        fileError: null,
        title: "",
        category: "Outro",
        examDate: null,
        notes: "",
        audience: [...EXAM_AUDIENCES],
        saving: false,
    };
}

function onFilePicked(value: File | File[] | null) {
    const f = Array.isArray(value) ? (value[0] ?? null) : value;
    upload.value.fileError = null;
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
        upload.value.fileError = `Arquivo tem ${(f.size / (1024 * 1024)).toFixed(1)} MB — o limite é 50 MB`;
        upload.value.file = null;
        return;
    }
    // Auto-fill the title from the filename if empty.
    if (!upload.value.title.trim()) {
        upload.value.title = f.name.replace(/\.[^.]+$/, "");
    }
}

async function submitUpload() {
    if (!upload.value.file || !upload.value.title.trim()) return;
    upload.value.saving = true;
    try {
        await uploadExam(upload.value.file, {
            title: upload.value.title.trim(),
            category: upload.value.category,
            examDate: upload.value.examDate,
            notes: upload.value.notes.trim(),
            audience: upload.value.audience.length ? upload.value.audience : [...EXAM_AUDIENCES],
        });
        notify("Documento enviado");
        upload.value.show = false;
        await load();
    } catch (e: unknown) {
        const err = e as {
            status?: number;
            statusCode?: number;
            data?: { message?: string };
            message?: string;
        };
        const is413 = err?.status === 413 || err?.statusCode === 413;
        notify(
            err?.data?.message ||
                (is413
                    ? "Arquivo grande demais para o servidor — tente um menor."
                    : err?.message || "Erro ao enviar"),
            "error",
        );
    } finally {
        upload.value.saving = false;
    }
}

// ===== Edit =====
const edit = ref({
    show: false,
    exam: null as ExamFile | null,
    title: "",
    category: "Outro" as string,
    examDate: null as string | null,
    notes: "",
    audience: [...EXAM_AUDIENCES] as ExamAudience[],
    saving: false,
});

function openEdit(exam: ExamFile) {
    edit.value = {
        show: true,
        exam,
        title: exam.title,
        category: exam.category,
        examDate: exam.examDate,
        notes: exam.notes,
        audience: exam.audience?.length ? [...exam.audience] : [...EXAM_AUDIENCES],
        saving: false,
    };
}

async function submitEdit() {
    if (!edit.value.exam) return;
    edit.value.saving = true;
    try {
        await updateExam(edit.value.exam.id, {
            title: edit.value.title,
            category: edit.value.category,
            examDate: edit.value.examDate,
            notes: edit.value.notes,
            audience: edit.value.audience.length ? edit.value.audience : [...EXAM_AUDIENCES],
        });
        notify("Documento atualizado");
        edit.value.show = false;
        await load();
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        notify(err?.data?.message || err?.message || "Erro ao salvar", "error");
    } finally {
        edit.value.saving = false;
    }
}

// ===== Preview =====
const preview = ref<{
    show: boolean;
    exam: ExamFile | null;
    url: string | null;
    kind: "pdf" | "image" | "other";
    loading: boolean;
}>({ show: false, exam: null, url: null, kind: "other", loading: false });

async function openPreview(exam: ExamFile) {
    const kind = isPdf(exam.contentType)
        ? "pdf"
        : isImage(exam.contentType)
          ? "image"
          : "other";
    preview.value = { show: true, exam, url: null, kind, loading: kind !== "other" };
    if (kind === "other") return;
    try {
        preview.value.url = await getPreviewUrl(exam.id);
    } catch {
        notify("Não foi possível carregar a pré-visualização", "error");
        preview.value.kind = "other";
    } finally {
        preview.value.loading = false;
    }
}

function closePreview() {
    preview.value.show = false;
}

async function download(exam: ExamFile | null) {
    if (!exam) return;
    try {
        await downloadExam(exam);
    } catch {
        notify("Erro ao baixar o documento", "error");
    }
}

// ===== Delete =====
const confirmDialog = ref<{ show: boolean; name: string; onConfirm: () => void }>({
    show: false,
    name: "",
    onConfirm: () => {},
});

function confirmDelete(exam: ExamFile) {
    confirmDialog.value = {
        show: true,
        name: exam.title,
        onConfirm: async () => {
            deleting.value = true;
            try {
                await deleteExam(exam.id);
                forgetPreview(exam.id);
                notify("Documento excluído");
                confirmDialog.value.show = false;
                await load();
            } catch (e: unknown) {
                const err = e as { data?: { message?: string }; message?: string };
                notify(err?.data?.message || err?.message || "Erro ao excluir", "error");
            } finally {
                deleting.value = false;
            }
        },
    };
}

onMounted(load);
</script>

<style scoped>
.exams-page {
    width: 100%;
}
.exam-card {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.exam-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.16);
}
.exam-thumb {
    position: relative;
    height: 120px;
    cursor: pointer;
    border-bottom: 1px solid rgba(128, 128, 128, 0.15);
}
.exam-thumb__badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
}
.exam-title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.25;
    min-height: 2.5em;
}
.exam-notes {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.preview-body {
    min-height: 60vh;
    background: rgba(128, 128, 128, 0.06);
}
.preview-frame {
    width: 100%;
    height: 74vh;
    border: 0;
    display: block;
}
</style>
