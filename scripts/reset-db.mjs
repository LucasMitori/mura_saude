#!/usr/bin/env node
/**
 * DESTRUCTIVE — resets the database to a clean state, keeping ONLY the admin
 * user defined by ADMIN_EMAIL in .env. Deletes every daily record, every
 * workout routine, and every non-admin user. Then re-asserts the admin (role +
 * password from .env) so you can start fresh.
 *
 * Usage:
 *   node scripts/reset-db.mjs            # dry preview (does nothing)
 *   node scripts/reset-db.mjs --yes      # actually wipe
 *
 * Run against whichever database your .env MONGODB_URI points to (use your
 * production env vars to clean the Vercel/Atlas database).
 */
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnv(filePath) {
    const txt = readFileSync(filePath, "utf8");
    const out = {};
    for (const raw of txt.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq < 0) continue;
        out[line.slice(0, eq).trim()] = line
            .slice(eq + 1)
            .trim()
            .replace(/^["']|["']$/g, "");
    }
    return out;
}

const env = parseEnv(resolve(process.cwd(), ".env"));
const MONGODB_URI = env.MONGODB_URI;
const ADMIN_EMAIL = (env.ADMIN_EMAIL || "").toLowerCase().trim();
const ADMIN_USERNAME = env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI in .env");
    process.exit(1);
}
if (!ADMIN_EMAIL) {
    console.error("Missing ADMIN_EMAIL in .env — needed to know which admin to keep.");
    process.exit(1);
}

const confirmed = process.argv.includes("--yes");
if (!confirmed) {
    console.log("⚠️  This will PERMANENTLY DELETE:");
    console.log("     • all daily records");
    console.log("     • all workout routines");
    console.log(`     • every user EXCEPT  ${ADMIN_EMAIL}`);
    console.log("");
    console.log("Re-run with --yes to proceed:");
    console.log("     node scripts/reset-db.mjs --yes");
    process.exit(1);
}

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("mura_saude");

    const daily = await db.collection("dailyRecords").deleteMany({});
    console.log(`[reset] dailyRecords deleted: ${daily.deletedCount}`);

    const routines = await db.collection("workoutRoutines").deleteMany({});
    console.log(`[reset] workoutRoutines deleted: ${routines.deletedCount}`);

    const users = await db
        .collection("users")
        .deleteMany({ email: { $ne: ADMIN_EMAIL } });
    console.log(`[reset] non-admin users deleted: ${users.deletedCount}`);

    // Re-assert the admin so the account is guaranteed valid afterwards.
    await db.collection("users").createIndex({ email: 1 }, { unique: true }).catch(() => {});
    const now = new Date();
    if (ADMIN_PASSWORD) {
        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const r = await db.collection("users").updateOne(
            { email: ADMIN_EMAIL },
            {
                $set: {
                    name: ADMIN_USERNAME,
                    email: ADMIN_EMAIL,
                    password: hashed,
                    role: "admin",
                    specialty: null,
                    updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true },
        );
        console.log(`[reset] admin ${r.upsertedCount > 0 ? "created" : "ensured"}: ${ADMIN_EMAIL}`);
    } else {
        await db
            .collection("users")
            .updateOne({ email: ADMIN_EMAIL }, { $set: { role: "admin", specialty: null, updatedAt: now } });
        console.log(`[reset] admin role ensured for ${ADMIN_EMAIL} (password unchanged — ADMIN_PASSWORD not set in .env)`);
    }

    await client.close();
    console.log("[reset] ✅ done — database is clean, only the admin remains.");
}

main().catch((err) => {
    console.error("[reset] failed:", err);
    process.exit(1);
});
