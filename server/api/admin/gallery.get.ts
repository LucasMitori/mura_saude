import { requireAdmin } from "#server/utils/roles";
import { getDatabase } from "#server/utils/mongodb";
import {
    MEAL_IMAGES_COLLECTION,
    ensureMealImageIndexes,
} from "#server/utils/meal-images";
import { MEAL_IMAGE_TTL_DAYS, MEAL_IMAGE_TTL_MS } from "../../../shared/meal-images";

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

// Admin gallery index: every stored photo's METADATA (never the binaries —
// those are fetched one by one via /api/meal-images/:id), grouped into
// day "folders", newest day first, ordered by meal time within the day.
export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const db = await getDatabase();
    await ensureMealImageIndexes(db);

    const docs = await db
        .collection(MEAL_IMAGES_COLLECTION)
        .find({}, { projection: { data: 0 } })
        .sort({ date: -1, mealTime: 1, createdAt: 1 })
        .toArray();

    const byDate = new Map<string, GalleryDay>();
    let totalBytes = 0;

    for (const d of docs) {
        const uploadedAt = d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt);
        const img: GalleryImage = {
            id: d._id.toString(),
            mealId: d.mealId,
            mealType: d.mealType || "",
            mealLabel: d.mealLabel || "",
            mealTime: d.mealTime || "",
            contentType: d.contentType,
            size: d.size || 0,
            uploadedAt: uploadedAt.toISOString(),
            expiresAt: new Date(uploadedAt.getTime() + MEAL_IMAGE_TTL_MS).toISOString(),
        };
        totalBytes += img.size;

        let day = byDate.get(d.date);
        if (!day) {
            day = { date: d.date, count: 0, totalBytes: 0, images: [] };
            byDate.set(d.date, day);
        }
        day.count += 1;
        day.totalBytes += img.size;
        day.images.push(img);
    }

    return {
        days: [...byDate.values()],
        totalCount: docs.length,
        totalBytes,
        ttlDays: MEAL_IMAGE_TTL_DAYS,
    };
});
