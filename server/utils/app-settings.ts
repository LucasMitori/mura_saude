import { Binary } from "mongodb";
import { getDatabase } from "#server/utils/mongodb";
import type { MealImageContentType } from "../../shared/meal-images";

// App-wide settings live in `appSettings`, keyed by a string _id. Unlike
// `mealImages` this collection has NO TTL index — the login background is
// permanent until an admin replaces or removes it.
export const APP_SETTINGS_COLLECTION = "appSettings";
export const LOGIN_BACKGROUND_ID = "loginBackground";

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
