import { Binary } from "mongodb";
import { getLoginBackground } from "#server/utils/app-settings";

// PUBLIC — the login page is pre-auth, so its background must be too. Serves
// only this one fixed setting; nothing user-addressable leaks through here.
export default defineEventHandler(async (event) => {
    const doc = await getLoginBackground();
    if (!doc) {
        throw createError({ statusCode: 404, message: "No login background set" });
    }

    setHeader(event, "Content-Type", doc.contentType);
    setHeader(event, "Content-Length", doc.size);
    // Short public cache: a replaced background shows up within a minute
    // without cache-busting URLs everywhere.
    setHeader(event, "Cache-Control", "public, max-age=60");
    const data = doc.data instanceof Binary ? doc.data.buffer : doc.data;
    return Buffer.from(data as Uint8Array);
});
