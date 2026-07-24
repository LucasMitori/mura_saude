#!/usr/bin/env node
/**
 * Performance + security + meal-correctness test suite.
 * Usage (dev server must be running):
 *   TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... node scripts/perf-security-test.mjs [base-url]
 *
 * Sections:
 *   A. Frontend performance — page HTML response times
 *   B. Backend performance  — API latency (avg/max over several runs)
 *   C. Meal correctness     — exact persistence, recompute, PARALLEL adds
 *   D. Security             — headers, authz, injection, upload abuse
 *   E. Rate limiting        — runs LAST (it poisons the login limiter)
 */
const BASE = process.argv[2] || "http://localhost:3000";
const EMAIL = process.env.TEST_ADMIN_EMAIL || "";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || "";

let token = "";
let passed = 0;
let failed = 0;
const failures = [];

function log(name, ok, detail = "") {
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
    ok ? passed++ : (failed++, failures.push(name));
}
function section(title) {
    console.log(`\n--- ${title} ---`);
}

async function api(method, path, body, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (!opts.anon && token) headers.Authorization = `Bearer ${token}`;
    const t0 = performance.now();
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const ms = performance.now() - t0;
    let json = null;
    try { json = await res.json(); } catch { /* binary/empty */ }
    return { status: res.status, json, ms, headers: res.headers };
}

// Multipart upload (exam documents travel as form-data, not JSON).
async function uploadForm(path, fields, fileBuf, filename, contentType, opts = {}) {
    const form = new FormData();
    form.append("file", new Blob([fileBuf], { type: contentType }), filename);
    for (const [k, v] of Object.entries(fields)) {
        if (Array.isArray(v)) v.forEach((x) => form.append(k, x));
        else form.append(k, v);
    }
    const headers = {};
    if (!opts.anon && token) headers.Authorization = `Bearer ${token}`;
    if (opts.headers) Object.assign(headers, opts.headers);
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: form });
    let json = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, json };
}

// Raw GET that keeps response headers (for verifying content-type/disposition).
async function rawGet(path, opts = {}) {
    const headers = {};
    if (!opts.anon && token) headers.Authorization = `Bearer ${token}`;
    if (opts.headers) Object.assign(headers, opts.headers);
    const res = await fetch(`${BASE}${path}`, { headers });
    return { status: res.status, headers: res.headers };
}

/** Time `fn` n times, return { avg, max } in ms. */
async function bench(n, fn) {
    const times = [];
    for (let i = 0; i < n; i++) times.push(await fn());
    return {
        avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        max: Math.round(Math.max(...times)),
    };
}

const TEST_DATE = "2026-06-05"; // dedicated test day, deleted at the end

async function cleanupTestDate() {
    const { json } = await api("GET", `/api/daily?date=${TEST_DATE}`);
    if (json?._id) await api("DELETE", `/api/daily/${json._id}`);
}

async function main() {
    console.log(`\n=== Performance & Security suite against ${BASE} ===`);

    // Login (also warms up the DB connection pool for fair perf numbers)
    {
        const { status, json, ms } = await api(
            "POST", "/api/auth/login", { email: EMAIL, password: PASSWORD }, { anon: true },
        );
        if (status !== 200 || !json?.token) {
            console.error(`Cannot login (status=${status}) — aborting.`);
            process.exit(1);
        }
        token = json.token;
        log("Admin login", true, `${Math.round(ms)}ms (includes bcrypt cost 12 — intentional)`);
    }

    // ============ A. FRONTEND PERFORMANCE ============
    section("A. Frontend performance");
    // Warm up first: in dev, Vite compiles each page on first hit — that
    // one-time compile cost is not what we're measuring.
    await Promise.all(
        ["/login", "/"].map((p) => fetch(`${BASE}${p}`, { headers: { accept: "text/html" } }).then((r) => r.text())),
    );
    for (const [path, budget] of [["/login", 4000], ["/", 4000]]) {
        const t0 = performance.now();
        const res = await fetch(`${BASE}${path}`, { headers: { accept: "text/html" } });
        const html = await res.text();
        const ms = Math.round(performance.now() - t0);
        log(
            `GET ${path} renders`,
            res.status === 200 && html.includes("<div id=\"__nuxt\"") && ms < budget,
            `${ms}ms (budget ${budget}ms), ${(html.length / 1024).toFixed(0)}KB`,
        );
    }

    // ============ B. BACKEND PERFORMANCE ============
    section("B. Backend performance (avg of 5 runs)");
    {
        const r = await bench(5, async () => (await api("GET", "/api/health", undefined, { anon: true })).ms);
        log("GET /api/health", r.avg < 500, `avg=${r.avg}ms max=${r.max}ms (budget 500ms)`);
    }
    {
        const r = await bench(5, async () => (await api("GET", `/api/daily?from=2026-01-01&limit=30`)).ms);
        log("GET /api/daily range (Atlas round-trip)", r.avg < 1500, `avg=${r.avg}ms max=${r.max}ms (budget 1500ms)`);
    }
    {
        const r = await bench(5, async () => (await api("GET", "/api/meals?type=lunch")).ms);
        log("GET /api/meals filter", r.avg < 1500, `avg=${r.avg}ms max=${r.max}ms (budget 1500ms)`);
    }
    {
        const r = await bench(3, async () => (await api("GET", "/api/admin/gallery")).ms);
        log("GET /api/admin/gallery", r.avg < 1500, `avg=${r.avg}ms max=${r.max}ms (budget 1500ms)`);
    }

    // ============ C. MEAL CORRECTNESS ============
    section("C. Meal correctness");
    await cleanupTestDate();

    // C1. Exact persistence of every field
    const foods = [
        { name: "Frango grelhado", weightGrams: 150, calories: 248, protein: 46.5, carbs: 0, fats: 5.4, fiber: 0 },
        { name: "Arroz integral", weightGrams: 120, calories: 132, protein: 3.1, carbs: 27.4, fats: 1, fiber: 2.2 },
    ];
    let mealId = "";
    {
        const t0 = performance.now();
        const { status, json } = await api("POST", "/api/meals", {
            date: TEST_DATE,
            meal: { type: "lunch", label: "Correctness check", time: "12:30", notes: "obs", foods },
        });
        const ms = Math.round(performance.now() - t0);
        mealId = json?.mealId || "";
        log("POST /api/meals persists", status === 200 && !!mealId, `${ms}ms`);
    }
    {
        const { json } = await api("GET", `/api/daily?date=${TEST_DATE}`);
        const m = (json?.meals || []).find((x) => x.id === mealId);
        const fieldsOk =
            m && m.type === "lunch" && m.label === "Correctness check" &&
            m.time === "12:30" && m.notes === "obs" &&
            m.foods.length === 2 &&
            m.foods[0].name === "Frango grelhado" &&
            m.foods[0].protein === 46.5 && m.foods[1].carbs === 27.4;
        const totalsOk = m && m.totalCalories === 380 && m.totalWeight === 270;
        const summaryOk =
            json?.summary?.totalCaloriesConsumed === 380 &&
            json?.summary?.totalProtein === 49.6 &&
            json?.summary?.totalCarbs === 27.4;
        log("Every meal field persisted exactly", !!fieldsOk);
        log("Totals recomputed server-side (380 kcal / 270g)", !!totalsOk, `kcal=${m?.totalCalories} g=${m?.totalWeight}`);
        log("Daily summary recomputed (kcal + macros)", !!summaryOk, `protein=${json?.summary?.totalProtein}`);
    }

    // C2. PARALLEL adds — no meal may be lost to a write race
    {
        const results = await Promise.all(
            [1, 2, 3, 4].map((i) =>
                api("POST", "/api/meals", {
                    date: TEST_DATE,
                    meal: { type: "snack", label: `Parallel ${i}`, time: `1${i}:00`,
                        foods: [{ name: `Item ${i}`, weightGrams: 100, calories: 100 }] },
                }),
            ),
        );
        const allOk = results.every((r) => r.status === 200);
        const { json } = await api("GET", `/api/daily?date=${TEST_DATE}`);
        const labels = (json?.meals || []).map((m) => m.label);
        const allPresent = [1, 2, 3, 4].every((i) => labels.includes(`Parallel ${i}`));
        log("4 parallel POSTs all succeed", allOk, results.map((r) => r.status).join(","));
        log("No meal lost to write race (atomic $push)", allPresent, `${labels.length} meals on the day`);
        log("Summary consistent after parallel adds",
            json?.summary?.totalCaloriesConsumed === 380 + 400,
            `consumed=${json?.summary?.totalCaloriesConsumed}`);
    }

    // C3. Parallel day-creation race (fresh date, simultaneous first writes)
    {
        const raceDate = "2026-06-06";
        const { json: pre } = await api("GET", `/api/daily?date=${raceDate}`);
        if (pre?._id) await api("DELETE", `/api/daily/${pre._id}`);
        const results = await Promise.all(
            [1, 2].map((i) =>
                api("POST", "/api/meals", {
                    date: raceDate,
                    meal: { type: "snack", label: `Race ${i}`, time: "09:00",
                        foods: [{ name: "x", weightGrams: 10, calories: 10 }] },
                }),
            ),
        );
        const { json } = await api("GET", `/api/daily?date=${raceDate}`);
        const ok = results.every((r) => r.status === 200) && (json?.meals?.length ?? 0) === 2;
        log("Concurrent day-creation handled (unique index + retry)", ok,
            `statuses=${results.map((r) => r.status).join(",")} meals=${json?.meals?.length}`);
        if (json?._id) await api("DELETE", `/api/daily/${json._id}`);
    }

    // C4. Edit + delete keep summary truthful
    {
        await api("PUT", `/api/meals/${mealId}`, {
            date: TEST_DATE,
            meal: { foods: [{ name: "Só frango", weightGrams: 150, calories: 248, protein: 46.5 }] },
        });
        const { json } = await api("GET", `/api/daily?date=${TEST_DATE}`);
        const m = (json?.meals || []).find((x) => x.id === mealId);
        log("Edit recomputes totals", m?.totalCalories === 248 && json?.summary?.totalCaloriesConsumed === 648,
            `meal=${m?.totalCalories} day=${json?.summary?.totalCaloriesConsumed}`);
    }

    // ============ D. SECURITY ============
    section("D. Security");
    {
        const res = await fetch(`${BASE}/login`);
        const h = res.headers;
        log("Security headers on pages",
            h.get("x-frame-options") === "DENY" &&
            h.get("x-content-type-options") === "nosniff" &&
            h.get("referrer-policy") === "no-referrer",
            "X-Frame-Options, nosniff, no-referrer");
    }
    {
        const { headers: h } = await api("GET", "/api/health", undefined, { anon: true });
        log("API responses are no-store", (h.get("cache-control") || "").includes("no-store"));
    }
    {
        const paths = ["/api/daily", "/api/meals", "/api/admin/gallery", "/api/measurements"];
        const results = await Promise.all(paths.map((p) => api("GET", p, undefined, { anon: true })));
        log("Protected endpoints → 401 without token", results.every((r) => r.status === 401));
    }
    {
        const { status } = await api("GET", "/api/daily", undefined, {
            anon: true, headers: { Authorization: "Bearer forged.jwt.token" },
        });
        log("Forged JWT → 401", status === 401);
    }
    {
        const { status } = await api("POST", "/api/auth/login",
            { email: { $ne: null }, password: { $ne: null } }, { anon: true });
        log("NoSQL injection on login rejected", status === 400 || status === 401, `status=${status}`);
    }
    {
        const { status } = await api("POST", "/api/auth/register",
            { name: "Weak", email: `weak-${Date.now()}@test.com`, password: "123456" }, { anon: true });
        log("Weak password rejected on register → 400", status === 400);
    }

    // ===== Per-account brute-force lockout (own throwaway account) =====
    {
        const lockEmail = `lock-${Date.now()}@test.com`;
        const lockPass = "LockStrong#1!";
        const reg = await api("POST", "/api/auth/register",
            { name: "Lock Test", email: lockEmail, password: lockPass }, { anon: true });

        // 5 wrong passwords trip the lock.
        const fails = [];
        for (let i = 0; i < 5; i++) {
            const r = await api("POST", "/api/auth/login",
                { email: lockEmail, password: "wrong-on-purpose" }, { anon: true });
            fails.push(r.status);
        }
        // 6th attempt — even with the CORRECT password — must be refused.
        const locked = await api("POST", "/api/auth/login",
            { email: lockEmail, password: lockPass }, { anon: true });
        const lockedByAccount =
            locked.status === 429 && /bloquead/i.test(locked.json?.message || "");
        log("Account locks after 5 failed logins (correct password also refused)",
            reg.status === 200 && fails.every((s) => s === 401) && lockedByAccount,
            `fails=${fails.join(",")} then=${locked.status} msg="${(locked.json?.message || "").slice(0, 40)}"`);
    }

    // ===== Token revocation (tokenVersion) =====
    {
        const email = `revoke-${Date.now()}@test.com`;
        const pass = "RevokeStrong#1!";
        const reg = await api("POST", "/api/auth/register",
            { name: "Revoke Test", email, password: pass }, { anon: true });
        const oldToken = reg.json?.token || "";
        const asOld = { anon: true, headers: { Authorization: `Bearer ${oldToken}` } };

        const before = await api("GET", "/api/auth/me", undefined, asOld);
        const revoke = await api("POST", "/api/auth/logout-all", undefined, asOld);
        const after = await api("GET", "/api/auth/me", undefined, asOld);
        log("logout-all revokes existing tokens (200 → 401)",
            before.status === 200 && revoke.status === 200 && after.status === 401,
            `before=${before.status} revoke=${revoke.status} after=${after.status}`);

        // Password change must also revoke, while handing back a working token.
        const fresh = await api("POST", "/api/auth/login", { email, password: pass }, { anon: true });
        const freshToken = fresh.json?.token || "";
        const asFresh = { anon: true, headers: { Authorization: `Bearer ${freshToken}` } };
        const changed = await api("PUT", "/api/auth/me",
            { currentPassword: pass, newPassword: "RevokeStrong#2!" }, asFresh);
        const rotated = changed.json?.token || "";
        const oldAfterChange = await api("GET", "/api/auth/me", undefined, asFresh);
        const newAfterChange = await api("GET", "/api/auth/me", undefined,
            { anon: true, headers: { Authorization: `Bearer ${rotated}` } });
        log("Password change revokes old tokens but returns a valid new one",
            changed.status === 200 && !!rotated &&
                oldAfterChange.status === 401 && newAfterChange.status === 200,
            `old=${oldAfterChange.status} new=${newAfterChange.status}`);
    }
    // Viewer privilege boundaries
    let viewerToken = "";
    let viewerId = "";
    {
        const { status, json } = await api("POST", "/api/auth/register",
            { name: "SecViewer", email: `viewer-${Date.now()}@test.com`, password: "ViewerStrong#1!" }, { anon: true });
        viewerToken = json?.token || "";
        viewerId = json?.user?.id || "";
        log("Viewer registered for privilege tests", status === 200 && !!viewerToken);
    }
    if (viewerToken) {
        const asViewer = { anon: true, headers: { Authorization: `Bearer ${viewerToken}` } };
        const checks = await Promise.all([
            api("POST", "/api/meals", { date: TEST_DATE, meal: { type: "snack", foods: [] } }, asViewer),
            api("PUT", "/api/settings/login-background", { dataUrl: "x" }, asViewer),
            api("GET", "/api/admin/gallery", undefined, asViewer),
            api("GET", "/api/admin/users", undefined, asViewer),
            api("DELETE", "/api/meal-images/aaaaaaaaaaaaaaaaaaaaaaaa", undefined, asViewer),
        ]);
        log("Viewer blocked from all write/admin surfaces (5× 403)",
            checks.every((r) => r.status === 403), checks.map((r) => r.status).join(","));
    }
    // ===== Nutritionist role: read-only on patient data, full power ONLY on diets =====
    if (viewerId && viewerToken) {
        // Promote the test user to manager+nutritionist (admin action). Roles are
        // resolved from the DB on every request, so the SAME token instantly
        // carries the new permissions — no re-login needed.
        const promote = await api("PUT", `/api/admin/users/${viewerId}`,
            { role: "manager", specialty: "nutritionist" });
        log("Admin promotes test user to nutritionist", promote.status === 200,
            `perms=${(promote.json?.permissions || []).join(",")}`);

        const asNutri = { anon: true, headers: { Authorization: `Bearer ${viewerToken}` } };

        // CAN view patient data (dashboard/reports feed)
        const reads = await Promise.all([
            api("GET", "/api/daily?from=2026-01-01", undefined, asNutri),
            api("GET", "/api/diets", undefined, asNutri),
        ]);
        log("Nutritionist CAN view dashboard data + diets", reads.every((r) => r.status === 200),
            reads.map((r) => r.status).join(","));

        // CANNOT touch patient data or any admin surface
        const denied = await Promise.all([
            api("POST", "/api/meals", { date: TEST_DATE, meal: { type: "snack", foods: [] } }, asNutri),
            api("PUT", "/api/water", { date: TEST_DATE, addMl: 100 }, asNutri),
            api("POST", "/api/measurements", { date: TEST_DATE, measurement: {} }, asNutri),
            api("PUT", "/api/workouts", { date: TEST_DATE, workout: null }, asNutri),
            api("DELETE", "/api/daily/aaaaaaaaaaaaaaaaaaaaaaaa", undefined, asNutri),
            api("GET", "/api/admin/users", undefined, asNutri),
            api("GET", "/api/admin/gallery", undefined, asNutri),
            api("PUT", "/api/settings/login-background", { dataUrl: "x" }, asNutri),
            api("PUT", `/api/admin/users/${viewerId}`, { role: "admin" }, asNutri),
            api("POST", "/api/meals/x/image", { date: TEST_DATE, dataUrl: "x" }, asNutri),
        ]);
        log("Nutritionist blocked from ALL patient-data writes + admin surfaces (10× 403)",
            denied.every((r) => r.status === 403), denied.map((r) => r.status).join(","));

        // CAN manage diets (their own domain): create → update → activate → delete
        const create = await api("POST", "/api/diets", {
            name: "Dieta E2E Nutri", targetCalories: 1800,
            meals: [{ type: "breakfast", time: "07:30", label: "Café",
                foods: [{ name: "Ovo cozido", weightGrams: 100, calories: 146, protein: 13.3 }] }],
        }, asNutri);
        const dietId = create.json?.dietId || "";
        const update = dietId ? await api("PUT", `/api/diets/${dietId}`, {
            name: "Dieta E2E Nutri v2", targetCalories: 1900, meals: [],
        }, asNutri) : { status: 0 };
        const activate = dietId ? await api("POST", `/api/diets/${dietId}/activate`, { active: true }, asNutri) : { status: 0 };
        const listAfter = await api("GET", "/api/diets", undefined, asNutri);
        const activeOk = (listAfter.json || []).some((d) => d._id === dietId && d.active === true);
        log("Nutritionist CAN create/update/activate diets",
            create.status === 200 && update.status === 200 && activate.status === 200 && activeOk,
            `create=${create.status} update=${update.status} activate=${activate.status} active=${activeOk}`);

        // Diet `active` flag cannot be forged through create/update bodies
        const forge = await api("POST", "/api/diets", { name: "Forge", active: true, meals: [] }, asNutri);
        const forged = (await api("GET", "/api/diets", undefined, asNutri)).json || [];
        const forgeDoc = forged.find((d) => d._id === forge.json?.dietId);
        log("Diet `active` not forgeable via body", forge.status === 200 && forgeDoc?.active === false);
        if (forge.json?.dietId) await api("DELETE", `/api/diets/${forge.json.dietId}`, undefined, asNutri);

        const del = dietId ? await api("DELETE", `/api/diets/${dietId}`, undefined, asNutri) : { status: 0 };
        log("Nutritionist CAN delete diets", del.status === 200);

        // Demote back to plain user and confirm diet writes are gone again
        const demote = await api("PUT", `/api/admin/users/${viewerId}`, { role: "user" });
        const dietDenied = await api("POST", "/api/diets", { name: "x", meals: [] }, asNutri);
        const dietReadOk = await api("GET", "/api/diets", undefined, asNutri);
        log("Demoted user: diet write → 403, diet read stays 200",
            demote.status === 200 && dietDenied.status === 403 && dietReadOk.status === 200,
            `write=${dietDenied.status} read=${dietReadOk.status}`);
    }

    // ===== Exam documents (GridFS) — sensitive-file security =====
    if (viewerId && viewerToken) {
        // Admin uploads a PDF exam (multipart → GridFS).
        const pdf = await uploadForm(
            "/api/exams",
            { title: "E2E Exame", category: "Exame de Sangue", notes: "teste", examDate: "2026-05-01" },
            Buffer.from("%PDF-1.4 e2e placeholder"),
            "hemograma.pdf",
            "application/pdf",
        );
        const examId = pdf.json?.id || "";
        log("Admin uploads exam (multipart→GridFS)", pdf.status === 200 && !!examId);

        const list = await api("GET", "/api/exams");
        log("Admin lists exams", list.status === 200 && (list.json || []).some((e) => e.id === examId));

        // Inline preview headers: real pdf type, nosniff, inline disposition, no-store.
        const prev = await rawGet(`/api/exams/${examId}`);
        log(
            "Exam PDF served inline with safe headers",
            prev.status === 200 &&
                (prev.headers.get("content-type") || "").includes("application/pdf") &&
                prev.headers.get("x-content-type-options") === "nosniff" &&
                (prev.headers.get("content-disposition") || "").startsWith("inline") &&
                (prev.headers.get("cache-control") || "").includes("no-store"),
        );

        // ?download=1 → forced attachment octet-stream.
        const dl = await rawGet(`/api/exams/${examId}?download=1`);
        log(
            "?download=1 forces attachment",
            (dl.headers.get("content-disposition") || "").startsWith("attachment") &&
                dl.headers.get("content-type") === "application/octet-stream",
        );

        // Uploaded HTML must be served as an attachment octet-stream (never text/html → no XSS).
        const htmlUp = await uploadForm(
            "/api/exams",
            { title: "evil", category: "Outro" },
            Buffer.from("<script>alert(document.cookie)</script>"),
            "evil.html",
            "text/html",
        );
        const htmlId = htmlUp.json?.id || "";
        const htmlServe = htmlId ? await rawGet(`/api/exams/${htmlId}`) : { headers: new Map() };
        log(
            "Unsafe HTML served as attachment octet-stream (no inline XSS)",
            htmlServe.headers.get?.("content-type") === "application/octet-stream" &&
                (htmlServe.headers.get?.("content-disposition") || "").startsWith("attachment"),
        );
        if (htmlId) await api("DELETE", `/api/exams/${htmlId}`);

        // Normal user (currently role "user") cannot list or fetch exams.
        const asUser = { anon: true, headers: { Authorization: `Bearer ${viewerToken}` } };
        const userList = await api("GET", "/api/exams", undefined, asUser);
        const userFile = await rawGet(`/api/exams/${examId}`, asUser);
        log("Normal user blocked from exams (list + file → 403)",
            userList.status === 403 && userFile.status === 403);

        // Anonymous cannot access a file.
        const anonFile = await rawGet(`/api/exams/${examId}`, { anon: true });
        log("Anonymous exam file → 401", anonFile.status === 401);

        // Nutritionist: view + download YES, upload + delete NO.
        await api("PUT", `/api/admin/users/${viewerId}`, { role: "manager", specialty: "nutritionist" });
        const nut = { anon: true, headers: { Authorization: `Bearer ${viewerToken}` } };
        const nutList = await api("GET", "/api/exams", undefined, nut);
        const nutFile = await rawGet(`/api/exams/${examId}`, nut);
        const nutUpload = await uploadForm("/api/exams", { title: "x", category: "Outro" },
            Buffer.from("%PDF-1.4"), "x.pdf", "application/pdf", nut);
        const nutDelete = await api("DELETE", `/api/exams/${examId}`, undefined, nut);
        log(
            "Nutritionist views+downloads exams but cannot upload/delete",
            nutList.status === 200 && nutFile.status === 200 &&
                nutUpload.status === 403 && nutDelete.status === 403,
            `list=${nutList.status} file=${nutFile.status} up=${nutUpload.status} del=${nutDelete.status}`,
        );
        await api("PUT", `/api/admin/users/${viewerId}`, { role: "user" });

        // Admin edits metadata + deletes.
        const editExam = await api("PUT", `/api/exams/${examId}`, { title: "E2E v2", category: "Laudo Médico" });
        const delExam = await api("DELETE", `/api/exams/${examId}`);
        log("Admin edits + deletes exam", editExam.status === 200 && delExam.status === 200);

        const badExam = await api("GET", "/api/exams/not-an-id");
        log("Malformed exam id → 400 (no 500 leak)", badExam.status === 400);

        // ===== 50 MB cap =====
        // Over the content-length guard (50 MB + 1 MB slack): the server rejects
        // before buffering, so the client may see a 413 or an aborted upload —
        // both mean "rejected".
        let bigStatus = 0;
        let bigErr = null;
        try {
            const big = await uploadForm("/api/exams", { title: "big", category: "Outro" },
                Buffer.alloc(52 * 1024 * 1024, 0x41), "big.pdf", "application/pdf");
            bigStatus = big.status;
        } catch (e) {
            bigErr = e?.message || String(e);
        }
        log("Exam upload > 50 MB rejected", bigStatus === 413 || !!bigErr,
            bigErr ? `connection rejected: ${bigErr.slice(0, 40)}` : `status=${bigStatus}`);

        // ===== Médico role + audience targeting =====
        // Admin uploads three docs with different audiences.
        const docMed = await uploadForm("/api/exams",
            { title: "Só médico", category: "Laudo Médico", audience: ["medico"] },
            Buffer.from("%PDF-1.4 med"), "med.pdf", "application/pdf");
        const docNut = await uploadForm("/api/exams",
            { title: "Só nutri", category: "Exame de Sangue", audience: ["nutritionist"] },
            Buffer.from("%PDF-1.4 nut"), "nut.pdf", "application/pdf");
        const docBoth = await uploadForm("/api/exams",
            { title: "Ambos", category: "Outro", audience: ["medico", "nutritionist"] },
            Buffer.from("%PDF-1.4 both"), "both.pdf", "application/pdf");
        const medId = docMed.json?.id, nutId = docNut.json?.id, bothId = docBoth.json?.id;
        log("Admin uploads 3 audience-targeted docs", !!medId && !!nutId && !!bothId);

        // Promote test user to médico — read-only, exams.view but NOT diet.edit/exams.edit.
        const promoteMed = await api("PUT", `/api/admin/users/${viewerId}`, { role: "manager", specialty: "medico" });
        const medPerms = promoteMed.json?.permissions || [];
        log("Médico role: exams.view yes; diet.edit / exams.edit no",
            promoteMed.status === 200 && medPerms.includes("exams.view") &&
                !medPerms.includes("diet.edit") && !medPerms.includes("exams.edit"),
            `perms=${medPerms.join(",")}`);
        const asMed = { anon: true, headers: { Authorization: `Bearer ${viewerToken}` } };

        const medExamList = await api("GET", "/api/exams", undefined, asMed);
        const medExamIds = (medExamList.json || []).map((e) => e.id);
        log("Médico sees only médico + ambos docs (not nutri-only)",
            medExamList.status === 200 && medExamIds.includes(medId) &&
                medExamIds.includes(bothId) && !medExamIds.includes(nutId),
            `count=${medExamIds.length}`);

        const medFetchOwn = await rawGet(`/api/exams/${medId}`, asMed);
        const medFetchOther = await rawGet(`/api/exams/${nutId}`, asMed);
        log("Médico fetches targeted doc (200) but nutri-only → 404",
            medFetchOwn.status === 200 && medFetchOther.status === 404,
            `own=${medFetchOwn.status} other=${medFetchOther.status}`);

        const medUp = await uploadForm("/api/exams", { title: "x", category: "Outro" },
            Buffer.from("%PDF"), "x.pdf", "application/pdf", asMed);
        const medDel = await api("DELETE", `/api/exams/${medId}`, undefined, asMed);
        const medDietTry = await api("POST", "/api/diets", { name: "x", meals: [] }, asMed);
        log("Médico is strictly read-only (no upload/delete/diet)",
            medUp.status === 403 && medDel.status === 403 && medDietTry.status === 403,
            `up=${medUp.status} del=${medDel.status} diet=${medDietTry.status}`);

        // Switch to nutricionista — sees nutri + ambos, médico-only hidden.
        await api("PUT", `/api/admin/users/${viewerId}`, { role: "manager", specialty: "nutritionist" });
        const asNut2 = { anon: true, headers: { Authorization: `Bearer ${viewerToken}` } };
        const nutExamList = await api("GET", "/api/exams", undefined, asNut2);
        const nutExamIds = (nutExamList.json || []).map((e) => e.id);
        const nutFetchMed = await rawGet(`/api/exams/${medId}`, asNut2);
        log("Nutricionista sees only nutri + ambos (médico-only → 404)",
            nutExamIds.includes(nutId) && nutExamIds.includes(bothId) &&
                !nutExamIds.includes(medId) && nutFetchMed.status === 404);

        await api("PUT", `/api/admin/users/${viewerId}`, { role: "user" });
        for (const id of [medId, nutId, bothId]) if (id) await api("DELETE", `/api/exams/${id}`);
        log("Audience docs cleanup", true);

        // ===== Weight privacy =====
        const pDate = "2026-06-09";
        // Clean any leftover, then seed a day with a weight measurement (admin).
        const pre = await api("GET", `/api/daily?date=${pDate}`);
        if (pre.json?._id) await api("DELETE", `/api/daily/${pre.json._id}`);
        await api("POST", "/api/daily", {
            date: pDate,
            caloricGoal: 2000,
            bodyMeasurements: [{
                time: "morning", timestamp: new Date().toISOString(),
                data: { weight: { value: 80.5, unit: "kg" }, bmi: 24 },
            }],
        });

        const setOn = await api("PUT", "/api/settings/privacy", { hideWeight: true });
        const userDay = await api("GET", `/api/daily?date=${pDate}`, undefined, asUser);
        const uw = userDay.json?.bodyMeasurements?.[0]?.data?.weight;
        log(
            "Privacy ON: plain user sees weight redacted to null",
            setOn.status === 200 && uw?.value === null && uw?.hidden === true && userDay.json?.weightHidden === true,
            `value=${uw?.value} hidden=${uw?.hidden}`,
        );

        const adminDay = await api("GET", `/api/daily?date=${pDate}`);
        log("Privacy ON: admin still sees the real weight",
            adminDay.json?.bodyMeasurements?.[0]?.data?.weight?.value === 80.5);

        const userToggle = await api("PUT", "/api/settings/privacy", { hideWeight: false }, asUser);
        log("Plain user cannot change privacy → 403", userToggle.status === 403);

        await api("PUT", "/api/settings/privacy", { hideWeight: false });
        const cleanDay = await api("GET", `/api/daily?date=${pDate}`);
        if (cleanDay.json?._id) await api("DELETE", `/api/daily/${cleanDay.json._id}`);
        log("Privacy restored + cleanup", true);

        // ===== Audit trail =====
        const audit = await api("GET", "/api/admin/audit?limit=500");
        const actions = new Set((audit.json || []).map((e) => e.action));
        log("Audit log records document access + logins",
            audit.status === 200 &&
                actions.has("exam.upload") && actions.has("exam.view") &&
                actions.has("exam.delete") && actions.has("auth.login.success"),
            `actions=${[...actions].slice(0, 6).join(",")}`);

        const filtered = await api("GET", "/api/admin/audit?action=exam.view&limit=50");
        log("Audit filter by action works",
            filtered.status === 200 &&
                (filtered.json || []).length > 0 &&
                (filtered.json || []).every((e) => e.action === "exam.view"));

        const auditAsUser = await api("GET", "/api/admin/audit", undefined, asUser);
        log("Non-admin cannot read the audit log → 403", auditAsUser.status === 403);

        // The trail must record failed logins too (the lockout test above).
        const failedAudit = await api("GET", "/api/admin/audit?action=auth.login.failed&limit=50");
        log("Failed logins are audited", failedAudit.status === 200 && (failedAudit.json || []).length > 0,
            `${(failedAudit.json || []).length} entries`);
    }

    {
        const { status } = await api("PUT", "/api/settings/login-background",
            { dataUrl: `data:image/png;base64,${"A".repeat(7 * 1024 * 1024)}` });
        log("Oversized login background → 413", status === 413);
    }
    {
        const { status } = await api("DELETE", "/api/meal-images/not-an-id");
        log("Malformed ObjectId → 400 (no 500 leak)", status === 400);
    }
    {
        const anonBg = await api("GET", "/api/settings/login-background", undefined, { anon: true });
        log("Login background readable pre-auth (by design)", anonBg.status === 200 || anonBg.status === 404,
            `status=${anonBg.status}`);
    }

    // Cleanup test day BEFORE the rate-limit section (login still works here)
    await cleanupTestDate();
    log("Cleanup: test day removed", true);

    // ============ E. RATE LIMITING (last — poisons the login limiter) ============
    section("E. Rate limiting");
    {
        let got429 = false;
        let attempts = 0;
        for (let i = 0; i < 25 && !got429; i++) {
            attempts++;
            const { status } = await api("POST", "/api/auth/login",
                { email: "nobody@nowhere.test", password: "wrong" }, { anon: true });
            if (status === 429) got429 = true;
        }
        log("Login brute-force throttled (429)", got429, `429 after ${attempts} attempts`);
    }

    console.log(`\n=== ${passed} passed, ${failed} failed ===`);
    if (failed > 0) {
        console.log("Failures:", failures.join("; "));
        process.exit(1);
    }
}

main().catch((e) => {
    console.error("suite crashed:", e);
    process.exit(1);
});
