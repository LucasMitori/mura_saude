#!/usr/bin/env node
/**
 * End-to-end smoke test against a running dev server.
 * Usage: node scripts/e2e-test.mjs [base-url]
 */
const BASE = process.argv[2] || "http://localhost:3000";
// Never hardcode real credentials. Provide them via env when running the test:
//   TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... node scripts/e2e-test.mjs
const EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || "";

let token = "";
let passed = 0;
let failed = 0;
const failures = [];

function log(name, ok, detail = "") {
    const tag = ok ? "✅" : "❌";
    console.log(`${tag} ${name}${detail ? " — " + detail : ""}`);
    ok ? passed++ : (failed++, failures.push(name));
}

async function api(method, path, body, anon = false) {
    const headers = { "Content-Type": "application/json" };
    if (!anon && token) headers.Authorization = `Bearer ${token}`;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    let json = null;
    try {
        json = await res.json();
    } catch {
        json = null;
    }
    return { status: res.status, json };
}

async function main() {
    console.log(`\n=== Mura Saúde e2e against ${BASE} ===\n`);

    // 1. Health
    {
        const { status, json } = await api("GET", "/api/health", undefined, true);
        log("GET /api/health", status === 200 && json?.status === "ok");
    }

    // 2. Auth required — should 401
    {
        const { status } = await api("GET", "/api/daily", undefined, true);
        log("GET /api/daily without token → 401", status === 401);
    }

    // 3. Login
    {
        const { status, json } = await api(
            "POST",
            "/api/auth/login",
            { email: EMAIL, password: PASSWORD },
            true,
        );
        if (status === 200 && json?.token) {
            token = json.token;
            log("POST /api/auth/login", true, `role=${json.user.role}`);
        } else {
            log("POST /api/auth/login", false, `status=${status} body=${JSON.stringify(json)}`);
            return;
        }
    }

    // 4. /me
    {
        const { status, json } = await api("GET", "/api/auth/me");
        log("GET /api/auth/me", status === 200 && json?.email === EMAIL);
    }

    // 5. Wrong password
    {
        const { status } = await api(
            "POST",
            "/api/auth/login",
            { email: EMAIL, password: "wrong" },
            true,
        );
        log("Wrong password → 401", status === 401);
    }

    // 6. Fetch daily range (works on an empty DB — the suite creates its own data)
    let firstDate = "";
    {
        const { status, json } = await api("GET", "/api/daily?from=2026-01-01");
        const ok = status === 200 && Array.isArray(json);
        if (ok && json.length > 0) firstDate = json[0].date;
        log("GET /api/daily range", ok, `${Array.isArray(json) ? json.length : "?"} records`);
    }

    // 7. Fetch single day (only when history exists, e.g. after seed:mock)
    if (firstDate) {
        const { status, json } = await api("GET", `/api/daily?date=${firstDate}`);
        const meals = json?.meals?.length || 0;
        const summary = json?.summary;
        log(
            `GET /api/daily?date=${firstDate}`,
            status === 200 && typeof summary?.totalCaloriesConsumed === "number",
            `meals=${meals} totalCalories=${summary?.totalCaloriesConsumed}`,
        );
    }

    // 8. Add a single meal (per-period flow)
    const testDate = "2026-06-04";
    // Clean up any leftover test data on this date from previous runs
    {
        const { json } = await api("GET", `/api/daily?date=${testDate}`);
        if (json?._id) {
            await api("DELETE", `/api/daily/${json._id}`);
        }
    }
    let mealId = "";
    {
        const meal = {
            type: "snack",
            label: "E2E test snack",
            time: "15:30",
            foods: [
                { name: "Test apple", weightGrams: 150, calories: 78, protein: 0, carbs: 21, fats: 0, fiber: 4 },
            ],
            totalCalories: 0,
            totalWeight: 0,
            notes: "e2e",
        };
        const { status, json } = await api("POST", "/api/meals", { date: testDate, meal });
        if (status === 200 && json?.mealId) {
            mealId = json.mealId;
            log("POST /api/meals (per-period add, autocreates day)", true, `mealId=${mealId.slice(0, 8)}`);
        } else {
            log("POST /api/meals", false, `status=${status}`);
        }
    }

    // 9. Verify the added meal & auto-recomputed summary
    {
        const { status, json } = await api("GET", `/api/daily?date=${testDate}`);
        const found = (json?.meals || []).find((m) => m.id === mealId);
        log(
            "Added meal exists + summary recomputed",
            status === 200 &&
                !!found &&
                json.summary.totalCaloriesConsumed === 78 &&
                json.summary.totalCarbs === 21,
            `consumed=${json?.summary?.totalCaloriesConsumed} carbs=${json?.summary?.totalCarbs}`,
        );
    }

    // 10. Edit the meal
    {
        const updated = {
            type: "snack",
            label: "E2E test snack (edited)",
            time: "16:00",
            foods: [
                { name: "Test apple", weightGrams: 150, calories: 78, protein: 0, carbs: 21, fats: 0, fiber: 4 },
                { name: "Test almonds", weightGrams: 30, calories: 174, protein: 6, carbs: 6, fats: 15, fiber: 4 },
            ],
            totalCalories: 0,
            totalWeight: 0,
        };
        const { status } = await api("PUT", `/api/meals/${mealId}`, {
            date: testDate,
            meal: updated,
        });
        log("PUT /api/meals/:id", status === 200);
    }

    // 11. Verify edit recomputed
    {
        const { json } = await api("GET", `/api/daily?date=${testDate}`);
        const m = (json?.meals || []).find((x) => x.id === mealId);
        log(
            "Edited meal totals recomputed",
            m?.totalCalories === 252 && json.summary.totalCaloriesConsumed === 252,
            `totalCalories=${m?.totalCalories}`,
        );
    }

    // 12. Search meals by food name
    {
        const { status, json } = await api("GET", "/api/meals?search=almonds");
        log(
            "GET /api/meals?search=almonds",
            status === 200 && Array.isArray(json) && json.some((r) => r.meal.id === mealId),
            `found=${Array.isArray(json) ? json.length : "?"}`,
        );
    }

    // 13. Search by meal type
    {
        const { status, json } = await api("GET", "/api/meals?type=lunch");
        log(
            "GET /api/meals?type=lunch",
            status === 200 && Array.isArray(json) && json.every((r) => r.meal.type === "lunch"),
            `found=${Array.isArray(json) ? json.length : "?"}`,
        );
    }

    // 14. Water increment
    {
        const before = await api("GET", `/api/daily?date=${testDate}`);
        const beforeMl = (before.json?.water?.intake?.value || 0);
        const { status } = await api("PUT", "/api/water", {
            date: testDate,
            addMl: 500,
        });
        const after = await api("GET", `/api/daily?date=${testDate}`);
        const afterMl = after.json?.water?.intake?.value || 0;
        log(
            "PUT /api/water (addMl=500) increments",
            status === 200 && Math.abs(afterMl - beforeMl - 0.5) < 0.01,
            `${beforeMl}L → ${afterMl}L`,
        );
    }

    // 15. Add a measurement
    let measurementId = "";
    {
        const measurement = {
            time: "morning",
            timestamp: new Date().toISOString(),
            data: {
                weight: { value: 78.0, unit: "kg" },
                bmi: 24.5,
                bodyFatPercentage: { value: 18.0, unit: "%" },
                bodyFatMass: { value: 14.0, unit: "kg" },
                skeletalMuscleMassPercentage: { value: 44, unit: "%" },
                muscleMassRecord: { value: 44, unit: "%" },
                skeletalMuscleMass: { value: 34, unit: "kg" },
                muscleMass: { value: 62, unit: "kg" },
                waterPercentage: { value: 58, unit: "%" },
                waterMass: { value: 45, unit: "kg" },
                visceralFat: 8,
                boneMass: { value: 3.3, unit: "kg" },
                basalMetabolicRate: { value: 1700, unit: "kcal" },
                proteinPercentage: { value: 18, unit: "%" },
                obesityPercentage: { value: 105, unit: "%" },
                metabolicAge: { value: 28, unit: "years" },
            },
        };
        const { status, json } = await api("POST", "/api/measurements", {
            date: testDate,
            measurement,
        });
        if (status === 200 && json?.measurementId) {
            measurementId = json.measurementId;
            log("POST /api/measurements", true);
        } else {
            log("POST /api/measurements", false, `status=${status}`);
        }
    }

    // 16. Delete the added meal
    if (mealId) {
        const { status } = await api("DELETE", `/api/meals/${mealId}`, { date: testDate });
        log("DELETE /api/meals/:id", status === 200);
    }

    // 17. Delete measurement
    if (measurementId) {
        const { status } = await api("DELETE", `/api/measurements/${measurementId}`, {
            date: testDate,
        });
        log("DELETE /api/measurements/:id", status === 200);
    }

    // 18. NoSQL injection sanitization
    {
        const { status, json } = await api("POST", "/api/meals", {
            date: testDate,
            meal: {
                type: "snack",
                "$where": "function() { return true; }",
                label: "evil",
                foods: [{ name: "x", weightGrams: 1, calories: 1 }],
            },
        });
        log("NoSQL injection sanitized (no crash)", status === 200);
        // Clean it up so re-runs are clean
        if (json?.mealId) {
            await api("DELETE", `/api/meals/${json.mealId}`, { date: testDate });
        }
    }

    // 19. Malformed ObjectId
    {
        const { status } = await api("DELETE", "/api/daily/notanobjectid");
        log("DELETE /api/daily/<bad-id> → 400 not 500", status === 400);
    }

    // 20. Public health still works
    {
        const { status } = await api("GET", "/api/health", undefined, true);
        log("Health endpoint still public", status === 200);
    }

    // 21. Register a viewer
    const viewerEmail = `viewer-${Date.now()}@test.com`;
    let viewerToken = "";
    {
        const { status, json } = await api(
            "POST",
            "/api/auth/register",
            { name: "Test Viewer", email: viewerEmail, password: "ViewerStrong#1!" },
            true,
        );
        if (status === 200 && json?.token) {
            viewerToken = json.token;
            // "viewer" was renamed to "user" (legacy value still normalizes) —
            // either way registration must never grant elevated roles.
            log(
                "POST /api/auth/register viewer",
                json.user.role === "user" || json.user.role === "viewer",
                `role=${json.user.role}`,
            );
        } else {
            log("POST /api/auth/register viewer", false, `status=${status}`);
        }
    }

    // 22. Viewer cannot add a meal (403)
    if (viewerToken) {
        const res = await fetch(`${BASE}/api/meals`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${viewerToken}`,
            },
            body: JSON.stringify({
                date: testDate,
                meal: { type: "snack", foods: [{ name: "x", weightGrams: 1, calories: 1 }] },
            }),
        });
        log("Viewer POST /api/meals → 403", res.status === 403);
    }

    // 23. Viewer CAN read admin data (the test day created above must be visible)
    if (viewerToken) {
        const res = await fetch(`${BASE}/api/daily?from=2026-01-01`, {
            headers: { Authorization: `Bearer ${viewerToken}` },
        });
        const data = await res.json();
        log(
            "Viewer GET /api/daily reads admin data",
            res.status === 200 && Array.isArray(data) && data.some((r) => r.date === testDate),
            `${Array.isArray(data) ? data.length : "?"} records`,
        );
    }

    // 24. Profile: GET /me returns avatar field
    {
        const { status, json } = await api("GET", "/api/auth/me");
        log("GET /api/auth/me returns avatar field", status === 200 && "avatar" in json);
    }

    // 25. Profile: update name via PUT /me
    {
        const newName = `Admin ${Date.now()}`;
        const { status, json } = await api("PUT", "/api/auth/me", { name: newName });
        log("PUT /api/auth/me update name", status === 200 && json?.name === newName);
        // restore
        await api("PUT", "/api/auth/me", { name: "admin" });
    }

    // 26. Profile: set + remove avatar
    {
        // tiny 1x1 png
        const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        const r1 = await api("PUT", "/api/auth/me", { avatar: dataUrl });
        const ok1 = r1.status === 200 && r1.json?.avatar === dataUrl;
        log("PUT /api/auth/me set avatar (data URL)", ok1);

        const r2 = await api("PUT", "/api/auth/me", { avatar: null });
        log("PUT /api/auth/me clear avatar (null)", r2.status === 200 && r2.json?.avatar === null);
    }

    // 27. Profile: reject avatar wrong format
    {
        const { status } = await api("PUT", "/api/auth/me", { avatar: "not-a-data-url" });
        log("PUT /api/auth/me reject bad avatar → 400", status === 400);
    }

    // 28. Profile: change password requires current
    {
        const { status } = await api("PUT", "/api/auth/me", { newPassword: "OtherStrong#1!" });
        log("PUT /api/auth/me new password without current → 400", status === 400);
    }

    // 29. Profile: wrong current password rejected
    {
        const { status } = await api("PUT", "/api/auth/me", {
            currentPassword: "wrongpw",
            newPassword: "OtherStrong#1!",
        });
        log("PUT /api/auth/me wrong current password → 401", status === 401);
    }

    // ===== Meal images (5MB max, 30-day TTL, admin gallery) =====

    // tiny valid 1x1 PNG
    const PNG_1PX =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    // 30. Create a meal to attach images to
    let imgMealId = "";
    {
        const { status, json } = await api("POST", "/api/meals", {
            date: testDate,
            meal: {
                type: "breakfast",
                label: "E2E image meal",
                time: "08:00",
                foods: [{ name: "Toast", weightGrams: 60, calories: 160 }],
            },
        });
        if (status === 200 && json?.mealId) imgMealId = json.mealId;
        log("POST /api/meals (image test meal)", !!imgMealId);
    }

    // 31. Upload a photo to the meal
    let imageId = "";
    if (imgMealId) {
        const { status, json } = await api("POST", `/api/meals/${imgMealId}/image`, {
            date: testDate,
            dataUrl: PNG_1PX,
        });
        if (status === 200 && json?.imageId) imageId = json.imageId;
        log("POST /api/meals/:id/image upload", !!imageId, `imageId=${imageId.slice(0, 8)}`);
    }

    // 32. Fetch the binary back with correct content type
    if (imageId) {
        const res = await fetch(`${BASE}/api/meal-images/${imageId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const buf = await res.arrayBuffer();
        log(
            "GET /api/meal-images/:id returns binary",
            res.status === 200 &&
                res.headers.get("content-type")?.includes("image/png") &&
                buf.byteLength > 0,
            `${buf.byteLength} bytes`,
        );
    }

    // 33. Meal carries the image ref
    if (imgMealId) {
        const { json } = await api("GET", `/api/daily?date=${testDate}`);
        const m = (json?.meals || []).find((x) => x.id === imgMealId);
        log(
            "Meal has image ref { id, uploadedAt }",
            m?.image?.id === imageId && typeof m?.image?.uploadedAt === "string",
        );
    }

    // 34. Anonymous fetch of image → 401
    if (imageId) {
        const res = await fetch(`${BASE}/api/meal-images/${imageId}`);
        log("GET /api/meal-images/:id without token → 401", res.status === 401);
    }

    // 35. Oversized payload rejected (>5MB) → 413
    if (imgMealId) {
        const { status } = await api("POST", `/api/meals/${imgMealId}/image`, {
            date: testDate,
            dataUrl: `data:image/png;base64,${"A".repeat(7 * 1024 * 1024)}`,
        });
        log("Oversized image (>5MB) → 413", status === 413, `status=${status}`);
    }

    // 36. Unsupported format rejected → 400
    if (imgMealId) {
        const { status } = await api("POST", `/api/meals/${imgMealId}/image`, {
            date: testDate,
            dataUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        });
        log("Unsupported format (gif) → 400", status === 400);
    }

    // 37. Content-type spoofing rejected (PNG bytes declared as JPEG) → 400
    if (imgMealId) {
        const { status } = await api("POST", `/api/meals/${imgMealId}/image`, {
            date: testDate,
            dataUrl: PNG_1PX.replace("data:image/png", "data:image/jpeg"),
        });
        log("Magic-byte mismatch rejected → 400", status === 400);
    }

    // 38. Admin gallery lists the photo grouped by day
    {
        const { status, json } = await api("GET", "/api/admin/gallery");
        const day = (json?.days || []).find((d) => d.date === testDate);
        const found = day?.images?.some((i) => i.id === imageId);
        log(
            "GET /api/admin/gallery groups by day",
            status === 200 && !!found && typeof json.totalBytes === "number" && json.ttlDays === 30,
            `days=${json?.days?.length} totalBytes=${json?.totalBytes}`,
        );
    }

    // 39. Viewer cannot access the gallery → 403
    if (viewerToken) {
        const res = await fetch(`${BASE}/api/admin/gallery`, {
            headers: { Authorization: `Bearer ${viewerToken}` },
        });
        log("Viewer GET /api/admin/gallery → 403", res.status === 403);
    }

    // 40. Admin deletes photo from gallery → binary gone AND ref cleared
    if (imageId) {
        const del = await api("DELETE", `/api/meal-images/${imageId}`);
        const gone = await fetch(`${BASE}/api/meal-images/${imageId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const { json } = await api("GET", `/api/daily?date=${testDate}`);
        const m = (json?.meals || []).find((x) => x.id === imgMealId);
        log(
            "DELETE /api/meal-images/:id (admin) clears binary + meal ref",
            del.status === 200 && gone.status === 404 && !m?.image,
        );
    }

    // 41. Deleting a meal cascades to its photo
    if (imgMealId) {
        const up = await api("POST", `/api/meals/${imgMealId}/image`, {
            date: testDate,
            dataUrl: PNG_1PX,
        });
        const newImageId = up.json?.imageId;
        await api("DELETE", `/api/meals/${imgMealId}`, { date: testDate });
        const gone = await fetch(`${BASE}/api/meal-images/${newImageId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        log("DELETE meal cascades to its photo", up.status === 200 && gone.status === 404);
    }

    // 42. Cleanup: remove the whole test day
    {
        const { json } = await api("GET", `/api/daily?date=${testDate}`);
        if (json?._id) {
            const { status } = await api("DELETE", `/api/daily/${json._id}`);
            log("Cleanup test day", status === 200);
        } else {
            log("Cleanup test day", true, "already absent");
        }
    }

    console.log(`\n=== ${passed} passed, ${failed} failed ===`);
    if (failed > 0) {
        console.log("Failures:", failures.join("; "));
        process.exit(1);
    }
}

main().catch((e) => {
    console.error("e2e crashed:", e);
    process.exit(1);
});
