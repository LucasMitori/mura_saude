import { Binary } from "mongodb";
import { getDatabase } from "#server/utils/mongodb";
import type { MealImageContentType } from "../../shared/meal-images";

// App-wide settings live in `appSettings`, keyed by a string _id. Unlike
// `mealImages` this collection has NO TTL index — the login background is
// permanent until an admin replaces or removes it.
export const APP_SETTINGS_COLLECTION = "appSettings";
export const LOGIN_BACKGROUND_ID = "loginBackground";
export const PRIVACY_ID = "privacy";

export interface LoginBackgroundDoc {
    _id: string;
    contentType: MealImageContentType;
    size: number;
    data: Binary;
    updatedAt: Date;
    updatedBy: string; // admin email, for auditing
}

export async function getLoginBackground(): Promise<LoginBackgroundDoc | null> {
    const db = await getDatabase();
    return await db
        .collection<LoginBackgroundDoc>(APP_SETTINGS_COLLECTION)
        .findOne({ _id: LOGIN_BACKGROUND_ID });
}

// ===== Privacy =====
export interface PrivacySettings {
    // When true, the patient's body weight is hidden ("-") from PLAIN viewers
    // (role "user"). Admin and managers (nutritionist/trainer) always see it.
    hideWeight: boolean;
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
    const db = await getDatabase();
    const doc = await db
        .collection(APP_SETTINGS_COLLECTION)
        .findOne({ _id: PRIVACY_ID as never });
    return { hideWeight: doc?.hideWeight === true };
}
