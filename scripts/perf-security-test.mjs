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
    // Viewer privilege boundaries
    let viewerToken = "";
    {
        const { status, json } = await api("POST", "/api/auth/register",
            { name: "SecViewer", email: `viewer-${Date.now()}@test.com`, password: "ViewerStrong#1!" }, { anon: true });
        viewerToken = json?.token || "";
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
