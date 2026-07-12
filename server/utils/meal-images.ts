import { Binary, ObjectId, type Db } from "mongodb";
import { getDatabase } from "#server/utils/mongodb";
import {
    MEAL_IMAGE_MAX_BYTES,
    MEAL_IMAGE_TTL_DAYS,
    type MealImageContentType,
} from "../../shared/meal-images";

export const MEAL_IMAGES_COLLECTION = "mealImages";

/** Stored document — the binary payload plus enough meal metadata for the
 *  admin gallery to render folders (day → time → meal) without joining back
 *  into dailyRecords. */
export interface MealImageDoc {
    _id?: ObjectId;
    userId: string;
    date: string; // YYYY-MM-DD of the daily record
    mealId: string;
    mealType: string;
    mealLabel: string;
    mealTime: string; // HH:mm
    contentType: MealImageContentType;
    size: number; // bytes of the decoded binary
    data: Binary;
    createdAt: Date; // TTL anchor — MongoDB deletes the doc 30 days after this
}

let indexesEnsured = false;

/** TTL index makes MongoDB itself garbage-collect photos after 30 days —
 *  no cron needed, works even when the app is not running. */
export async function ensureMealImageIndexes(db?: Db): Promise<void> {
    if (indexesEnsured) return;
    const database = db || (await getDatabase());
    const col = database.collection(MEAL_IMAGES_COLLECTION);
    await col
        .createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: MEAL_IMAGE_TTL_DAYS * 24 * 60 * 60 },
        )
        .catch(() => {});
    await col.createIndex({ date: -1 }).catch(() => {});
    await col.createIndex({ mealId: 1 }).catch(() => {});
    indexesEnsured = true;
}

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** Magic-byte sniffing — the declared MIME type is client-controlled, so we
 *  verify the actual bytes before storing/serving them. */
function sniffImageType(buf: Buffer): MealImageContentType | null {
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return "image/jpeg";
    }
    if (
        buf.length > 8 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    ) {
        return "image/png";
    }
    if (
        buf.length > 12 &&
        buf.toString("ascii", 0, 4) === "RIFF" &&
        buf.toString("ascii", 8, 12) === "WEBP"
    ) {
        return "image/webp";
    }
    return null;
}

export interface DecodedImage {
    buffer: Buffer;
    contentType: MealImageContentType;
    size: number;
}

/** Validate + decode a `data:image/...;base64,` payload.
 *  Enforces: allowed type, 5 MB cap, and magic bytes matching the declared type. */
export function decodeAndValidateImage(dataUrl: unknown): DecodedImage {
    if (typeof dataUrl !== "string") {
        throw createError({ statusCode: 400, message: "Image payload is required" });
    }
    // Cheap pre-check before regex/decode: base64 inflates ~4/3, so anything
    // longer than this cannot possibly be within the 5 MB limit.
    if (dataUrl.length > Math.ceil((MEAL_IMAGE_MAX_BYTES * 4) / 3) + 64) {
        throw createError({
            statusCode: 413,
            message: "A imagem excede o limite de 5 MB",
        });
    }
    const match = DATA_URL_PATTERN.exec(dataUrl);
    if (!match) {
        throw createError({
            statusCode: 400,
            message: "Formato inválido — envie JPEG, PNG ou WebP",
        });
    }
    const declared = match[1] as MealImageContentType;
    let buffer: Buffer;
    try {
        buffer = Buffer.from(match[2]!, "base64");
    } catch {
        throw createError({ statusCode: 400, message: "Imagem base64 inválida" });
    }
    if (buffer.length === 0) {
        throw createError({ statusCode: 400, message: "Imagem vazia" });
    }
    if (buffer.length > MEAL_IMAGE_MAX_BYTES) {
        throw createError({
            statusCode: 413,
            message: "A imagem excede o limite de 5 MB",
        });
    }
    const sniffed = sniffImageType(buffer);
    if (!sniffed || sniffed !== declared) {
        throw createError({
            statusCode: 400,
            message: "O conteúdo do arquivo não corresponde a uma imagem válida",
        });
    }
    return { buffer, contentType: sniffed, size: buffer.length };
}

/** Delete image binaries by id — used when a meal/day is deleted or a photo
 *  is replaced. Best-effort: missing ids are ignored. */
export async function deleteMealImagesByIds(ids: string[]): Promise<number> {
    const valid = ids.filter((id) => /^[a-fA-F0-9]{24}$/.test(id));
    if (valid.length === 0) return 0;
    const db = await getDatabase();
    const res = await db
        .collection(MEAL_IMAGES_COLLECTION)
        .deleteMany({ _id: { $in: valid.map((id) => new ObjectId(id)) } });
    return res.deletedCount;
}
