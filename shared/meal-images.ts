// Single source of truth for the meal-photo feature limits. Imported by BOTH
// the server (validation + TTL index) and the client (pre-upload checks and the
// "photo expired" message), so the two can never drift.

export const MEAL_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB per photo
export const MEAL_IMAGE_TTL_DAYS = 30; // photos auto-delete after 1 month
export const MEAL_IMAGE_TTL_MS = MEAL_IMAGE_TTL_DAYS * 24 * 60 * 60 * 1000;

export const MEAL_IMAGE_ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
] as const;

export type MealImageContentType = (typeof MEAL_IMAGE_ALLOWED_TYPES)[number];

/** Reference stored on a Meal. Survives the photo's TTL deletion so the UI can
 *  tell the user WHY the photo is gone instead of silently dropping it. */
export interface MealImageRef {
    id: string;
    uploadedAt: string; // ISO timestamp of the upload
}

/** True once the photo's 30-day retention window has passed (i.e. MongoDB's
 *  TTL monitor has deleted — or is about to delete — the binary). */
export function isMealImageExpired(ref: MealImageRef, now: Date = new Date()): boolean {
    const uploaded = new Date(ref.uploadedAt).getTime();
    if (Number.isNaN(uploaded)) return false;
    return now.getTime() - uploaded >= MEAL_IMAGE_TTL_MS;
}

/** Days remaining before auto-deletion (0 when already expired). */
export function mealImageDaysLeft(ref: MealImageRef, now: Date = new Date()): number {
    const uploaded = new Date(ref.uploadedAt).getTime();
    if (Number.isNaN(uploaded)) return MEAL_IMAGE_TTL_DAYS;
    const left = MEAL_IMAGE_TTL_MS - (now.getTime() - uploaded);
    return Math.max(0, Math.ceil(left / (24 * 60 * 60 * 1000)));
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
