import { $fetch } from "ofetch";
import { useAuthStore } from "~/stores/auth.store";
import {
    MEAL_IMAGE_MAX_BYTES,
    MEAL_IMAGE_ALLOWED_TYPES,
} from "#shared/meal-images";

export interface GalleryImage {
    id: string;
    mealId: string;
    mealType: string;
    mealLabel: string;
    mealTime: string;
    contentType: string;
    size: number;
    uploadedAt: string;
    expiresAt: string;
}

export interface GalleryDay {
    date: string;
    count: number;
    totalBytes: number;
    images: GalleryImage[];
}

export interface GalleryResponse {
    days: GalleryDay[];
    totalCount: number;
    totalBytes: number;
    ttlDays: number;
}

/** What the meal form tells its parent to do with the photo on save. */
export interface MealImageUpdate {
    file: File | null; // new photo to upload (replaces any existing one)
    remove: boolean; // explicit "remove current photo" request
}

// The API requires an Authorization header, so photos can't be plain <img src>
// URLs — they're fetched as blobs and exposed via object URLs. Cached per
// image id for the session (photos are immutable; replacements get new ids).
const objectUrlCache = new Map<string, Promise<string>>();

export function useMealImages() {
    const authStore = useAuthStore();

    function headers() {
        return authStore.authHeaders;
    }

    /** Client-side pre-validation, mirroring the server rules. Returns an
     *  error message (pt-BR) or null when the file is acceptable. */
    function validateImageFile(file: File): string | null {
        if (!MEAL_IMAGE_ALLOWED_TYPES.includes(file.type as never)) {
            return "Formato não suportado — use JPEG, PNG ou WebP";
        }
        if (file.size > MEAL_IMAGE_MAX_BYTES) {
            return `A imagem tem ${(file.size / (1024 * 1024)).toFixed(1)} MB — o limite é 5 MB`;
        }
        return null;
    }

    // Uploads travel as base64 JSON (+33%), and hosts like Vercel cap request
    // bodies at ~4.5 MB — so the practical wire limit is well below the app's
    // 5 MB cap. Compressing client-side (downscale + WebP) keeps any photo,
    // even a 20 MB camera shot, comfortably inside every limit.
    const COMPRESS_MAX_DIMENSION = 2560;
    const COMPRESS_TARGET_BYTES = 2_500_000;

    /** Downscale/recompress an image so it uploads reliably everywhere.
     *  Returns the original file when it's already small enough, or a WebP
     *  re-encode otherwise. Unsupported formats pass through untouched so
     *  validateImageFile can report them. */
    async function compressImageFile(file: File): Promise<File> {
        if (!MEAL_IMAGE_ALLOWED_TYPES.includes(file.type as never)) return file;
        if (file.size <= COMPRESS_TARGET_BYTES) return file;

        const url = URL.createObjectURL(file);
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = () => reject(new Error("Não foi possível ler a imagem"));
                i.src = url;
            });
            const baseName = file.name.replace(/\.\w+$/, "") || "foto";
            // Step quality down, then dimensions, until the target is met —
            // even pathological images (pure noise) eventually fit.
            let best: Blob | null = null;
            for (const dimFactor of [1, 0.7, 0.5, 0.35]) {
                const maxDim = COMPRESS_MAX_DIMENSION * dimFactor;
                const scale = Math.min(
                    1,
                    maxDim / Math.max(img.naturalWidth, img.naturalHeight),
                );
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
                const ctx = canvas.getContext("2d");
                if (!ctx) return file;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                for (const quality of [0.85, 0.7, 0.55]) {
                    const blob = await new Promise<Blob | null>((r) =>
                        canvas.toBlob(r, "image/webp", quality),
                    );
                    if (!blob) break;
                    if (!best || blob.size < best.size) best = blob;
                    if (blob.size <= COMPRESS_TARGET_BYTES) {
                        return new File([blob], `${baseName}.webp`, { type: "image/webp" });
                    }
                }
            }
            if (!best) return file;
            return new File([best], `${baseName}.webp`, { type: "image/webp" });
        } catch {
            return file;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    function fileToDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
            reader.readAsDataURL(file);
        });
    }

    async function uploadMealImage(date: string, mealId: string, file: File) {
        const problem = validateImageFile(file);
        if (problem) throw new Error(problem);
        const dataUrl = await fileToDataUrl(file);
        return await $fetch<{ success: boolean; imageId: string; uploadedAt: string }>(
            `/api/meals/${mealId}/image`,
            { method: "POST", body: { date, dataUrl }, headers: headers() },
        );
    }

    async function removeMealImage(date: string, mealId: string) {
        return await $fetch<{ success: boolean }>(`/api/meals/${mealId}/image`, {
            method: "DELETE",
            body: { date },
            headers: headers(),
        });
    }

    /** Resolve an image id to a displayable object URL (cached). Throws on
     *  404 — callers decide whether that means "expired" or "removed". */
    function getImageObjectUrl(imageId: string): Promise<string> {
        let cached = objectUrlCache.get(imageId);
        if (!cached) {
            cached = $fetch<Blob>(`/api/meal-images/${imageId}`, {
                responseType: "blob",
                headers: headers(),
            }).then((blob) => URL.createObjectURL(blob));
            // Don't cache failures — a retry should hit the network again.
            cached.catch(() => objectUrlCache.delete(imageId));
            objectUrlCache.set(imageId, cached);
        }
        return cached;
    }

    async function fetchGallery(): Promise<GalleryResponse> {
        return await $fetch<GalleryResponse>("/api/admin/gallery", {
            headers: headers(),
        });
    }

    async function adminDeleteImage(imageId: string) {
        const res = await $fetch<{ success: boolean; freedBytes: number }>(
            `/api/meal-images/${imageId}`,
            { method: "DELETE", headers: headers() },
        );
        objectUrlCache.delete(imageId);
        return res;
    }

    return {
        validateImageFile,
        compressImageFile,
        uploadMealImage,
        removeMealImage,
        getImageObjectUrl,
        fetchGallery,
        adminDeleteImage,
    };
}
