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
        uploadMealImage,
        removeMealImage,
        getImageObjectUrl,
        fetchGallery,
        adminDeleteImage,
    };
}
