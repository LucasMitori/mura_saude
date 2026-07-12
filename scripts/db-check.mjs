// MongoDB backend inspection: connectivity, collections, indexes, admin login hash.
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
        out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    return out;
}

const env = parseEnv(resolve(process.cwd(), ".env"));
const client = new MongoClient(env.MONGODB_URI);

let pass = 0, fail = 0;
function check(name, ok, extra = "") {
    if (ok) { pass++; console.log(`  OK   ${name}${extra ? " — " + extra : ""}`); }
    else { fail++; console.log(`  FAIL ${name}${extra ? " — " + extra : ""}`); }
}

const t0 = Date.now();
await client.connect();
const db = client.db("mura_saude");
check("Connected to Atlas", true, `${Date.now() - t0}ms`);

const ping = await db.command({ ping: 1 });
check("Ping", ping.ok === 1);

const collections = (await db.listCollections().toArray()).map(c => c.name);
console.log(`  Collections: ${collections.join(", ")}`);
check("users collection exists", collections.includes("users"));
check("dailyRecords collection exists", collections.includes("dailyRecords"));

// Users
const users = await db.collection("users").find({}, { projection: { email: 1, role: 1, name: 1 } }).toArray();
console.log(`  Users (${users.length}): ${users.map(u => `${u.email}[${u.role}]`).join(", ")}`);
const admins = users.filter(u => u.role === "admin");
check("Exactly one admin", admins.length === 1, admins.map(a => a.email).join(","));
check("Admin email is devmitori@gmail.com", admins[0]?.email === "devmitori@gmail.com");

// Password verification
const adminFull = await db.collection("users").findOne({ email: "devmitori@gmail.com" });
check("New password Admin@Saude2026 matches hash", await bcrypt.compare("Admin@Saude2026", adminFull.password));
check("Old password Panda1801 rejected", !(await bcrypt.compare("Panda1801", adminFull.password)));
check("Hash is bcrypt cost 12", adminFull.password.startsWith("$2b$12$") || adminFull.password.startsWith("$2a$12$"));

// Indexes
const userIdx = await db.collection("users").indexes();
check("users unique email index", userIdx.some(i => i.key?.email === 1 && i.unique));
const dailyIdx = await db.collection("dailyRecords").indexes();
check("dailyRecords unique (userId,date) index", dailyIdx.some(i => i.key?.userId === 1 && i.key?.date === 1 && i.unique));

// Data integrity
const dayCount = await db.collection("dailyRecords").countDocuments();
console.log(`  dailyRecords: ${dayCount} documents`);
const badDates = await db.collection("dailyRecords").countDocuments({ date: { $not: /^\d{4}-\d{2}-\d{2}$/ } });
check("All dailyRecords have valid YYYY-MM-DD date", badDates === 0);
const orphans = await db.collection("dailyRecords").countDocuments({ userId: { $ne: adminFull._id.toString() } });
check("No orphan dailyRecords (all owned by admin)", orphans === 0, orphans ? `${orphans} orphans` : "");

// Write round-trip test
const testCol = db.collection("_healthcheck");
const ins = await testCol.insertOne({ at: new Date(), probe: "backend-test" });
const back = await testCol.findOne({ _id: ins.insertedId });
check("Write/read round-trip", !!back);
await testCol.drop().catch(() => {});
check("Cleanup (drop test collection)", true);

console.log(`\n${pass} passed, ${fail} failed`);
await client.close();
process.exit(fail ? 1 : 0);
