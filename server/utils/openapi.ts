// Hand-written OpenAPI 3.0 spec for the Mura Saúde API. Served (gated) at
// /api/docs/openapi and rendered by Swagger UI at /docs.

const bearer = [{ bearerAuth: [] as string[] }];

const ok = (description: string) => ({ description });
const jsonObj = { content: { "application/json": { schema: { type: "object" } } } };

function authPerm(perm: string) {
    return `Requires a Bearer token whose user has the **${perm}** permission (enforced server-side from the DB role — never the token claim).`;
}

export function getOpenApiSpec() {
    return {
        openapi: "3.0.3",
        info: {
            title: "Mura Saúde API",
            version: "1.0.0",
            description:
                "Health-tracking API (meals, bioimpedância, water, workouts, routines) with role/permission-based access control. " +
                "All mutations are enforced server-side: the JWT proves identity only; roles & permissions are resolved from the database on every request.",
        },
        servers: [{ url: "/", description: "Same origin" }],
        components: {
            securitySchemes: {
                bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        statusCode: { type: "integer", example: 403 },
                        message: { type: "string", example: "Você não tem permissão para esta ação" },
                    },
                },
                UserProfile: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                        role: { type: "string", enum: ["admin", "manager", "user"] },
                        specialty: { type: "string", enum: ["personal_trainer", "nutritionist"], nullable: true },
                        permissions: { type: "array", items: { type: "string" } },
                        avatar: { type: "string", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                AuthResponse: {
                    type: "object",
                    properties: {
                        token: { type: "string", description: "JWT bearer token" },
                        user: { $ref: "#/components/schemas/UserProfile" },
                    },
                },
            },
        },
        security: [],
        tags: [
            { name: "Auth", description: "Registration, login, profile" },
            { name: "Daily", description: "Daily records (single-patient data)" },
            { name: "Meals", description: "Per-meal CRUD" },
            { name: "Meal Images", description: "Meal photos (5 MB max, auto-deleted after 30 days via MongoDB TTL)" },
            { name: "Measurements", description: "Bioimpedância entries" },
            { name: "Water", description: "Water intake" },
            { name: "Workout", description: "A day's logged workout" },
            { name: "Routines", description: "Reusable workout routines (treinos)" },
            { name: "Diets", description: "Diet plans built by the nutritionist (diet.edit); viewable by everyone (diet.view)" },
            { name: "Exercises", description: "Exercise search (wger + local)" },
            { name: "Nutrition", description: "Food search (Open Food Facts)" },
            { name: "Admin", description: "User role management" },
            { name: "Settings", description: "App customization (login background — permanent, no TTL) + privacy" },
            { name: "Exams", description: "Sensitive medical documents in GridFS (admin uploads; nutricionista + médico view only the documents targeted to them; never normal users)" },
            { name: "Health", description: "Service health" },
        ],
        paths: {
            "/api/auth/register": {
                post: {
                    tags: ["Auth"],
                    summary: "Register (always creates a read-only `user`)",
                    description: "Rate-limited. The role is never read from the body — self-registration cannot elevate privileges.",
                    requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } } } } } },
                    responses: { "200": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } }, "400": ok("Validation error"), "409": ok("Email already registered"), "429": ok("Rate limited") },
                },
            },
            "/api/auth/login": {
                post: {
                    tags: ["Auth"],
                    summary: "Login",
                    description: "Rate-limited per IP **and** per account: 8 failed attempts lock the account for 15 minutes (429). Time-equalized against user enumeration. Issues a token carrying the account's current `tokenVersion`.",
                    requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } } },
                    responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } }, "401": ok("Invalid credentials"), "429": ok("Rate limited") },
                },
            },
            "/api/auth/me": {
                get: { tags: ["Auth"], summary: "Current profile (with permissions)", security: bearer, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/UserProfile" } } } }, "401": ok("Unauthenticated") } },
                put: { tags: ["Auth"], summary: "Update own name / avatar / password", description: "Self-edit only. Cannot change role. Avatar max 5 MB.", security: bearer, requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, avatar: { type: "string", nullable: true }, currentPassword: { type: "string" }, newPassword: { type: "string" } } } } } }, responses: { "200": { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/UserProfile" } } } }, "401": ok("Wrong current password"), "413": ok("Avatar too large") } },
            },
            "/api/auth/logout-all": {
                post: { tags: ["Auth"], summary: "Revoke every session of this account", description: "Bumps the user's `tokenVersion`, invalidating **all** issued tokens (including the caller's). Use after a lost device or suspected compromise.", security: bearer, responses: { "200": ok("All sessions ended"), "401": ok("Unauthenticated") } },
            },
            "/api/admin/audit": {
                get: { tags: ["Admin"], summary: "Audit trail (who accessed what)", description: authPerm("users.manage") + " Read-only; entries auto-expire after 180 days (TTL). Filter with `?action=` and `?limit=`.", security: bearer, parameters: [{ name: "action", in: "query", schema: { type: "string", example: "exam.view" } }, { name: "limit", in: "query", schema: { type: "integer" } }], responses: { "200": jsonObj, "403": ok("Forbidden") } },
            },
            "/api/auth/seed-admin": {
                post: { tags: ["Auth"], summary: "Bootstrap/repair the admin user", description: "Backdoor protected by the JWT secret in the body. Rate-limited. Use only to recover the admin account.", requestBody: { content: { "application/json": { schema: { type: "object", properties: { secret: { type: "string" } } } } } }, responses: { "200": ok("Admin created/updated"), "403": ok("Bad secret") } },
            },
            "/api/daily": {
                get: { tags: ["Daily"], summary: "Fetch a day (?date=) or range (?from=&to=&limit=)", security: bearer, parameters: [{ name: "date", in: "query", schema: { type: "string", example: "2026-06-07" } }, { name: "from", in: "query", schema: { type: "string" } }, { name: "to", in: "query", schema: { type: "string" } }], responses: { "200": jsonObj, "401": ok("Unauthenticated") } },
                post: { tags: ["Daily"], summary: "Create/replace a full day", description: authPerm("nutrition.edit"), security: bearer, requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": ok("Saved"), "403": ok("Forbidden") } },
            },
            "/api/daily/{id}": {
                put: { tags: ["Daily"], summary: "Update a day's notes/goal", description: authPerm("nutrition.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Updated"), "403": ok("Forbidden"), "404": ok("Not found") } },
                delete: { tags: ["Daily"], summary: "Delete a day", description: authPerm("nutrition.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Deleted"), "403": ok("Forbidden") } },
            },
            "/api/meals": {
                get: { tags: ["Meals"], summary: "Search meals (?from=&to=&type=&search=)", security: bearer, responses: { "200": jsonObj } },
                post: { tags: ["Meals"], summary: "Add a meal to a date", description: authPerm("nutrition.edit"), security: bearer, responses: { "200": ok("Added"), "403": ok("Forbidden") } },
            },
            "/api/meals/{id}": {
                put: { tags: ["Meals"], summary: "Edit a meal", description: authPerm("nutrition.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Updated"), "403": ok("Forbidden") } },
                delete: { tags: ["Meals"], summary: "Delete a meal", description: authPerm("nutrition.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Deleted"), "403": ok("Forbidden") } },
            },
            "/api/meals/{id}/image": {
                post: { tags: ["Meal Images"], summary: "Attach/replace a meal's photo", description: authPerm("nutrition.edit") + " Body: `{ date, dataUrl }` — a `data:image/(jpeg|png|webp);base64,` payload, max 5 MB, magic-byte validated. Replacing deletes the previous binary. Photos are auto-deleted after 30 days (TTL); the meal keeps a `{ id, uploadedAt }` ref so the UI can explain the expiry.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["date", "dataUrl"], properties: { date: { type: "string", example: "2026-07-11" }, dataUrl: { type: "string" } } } } } }, responses: { "200": ok("Uploaded — returns { imageId, uploadedAt }"), "400": ok("Invalid format / magic-byte mismatch"), "403": ok("Forbidden"), "404": ok("Meal not found"), "413": ok("Larger than 5 MB") } },
                delete: { tags: ["Meal Images"], summary: "Remove a meal's photo (editor)", description: authPerm("nutrition.edit") + " Deletes the binary AND clears the meal's ref (no expiry message is shown). Body: `{ date }`.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Removed"), "404": ok("Meal or image not found") } },
            },
            "/api/meal-images/{id}": {
                get: { tags: ["Meal Images"], summary: "Fetch a photo binary", description: authPerm("nutrition.view") + " Returns the raw image with its content type. 404 after TTL expiry or deletion.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Image binary", content: { "image/jpeg": {}, "image/png": {}, "image/webp": {} } }, "404": ok("Not found or expired") } },
                delete: { tags: ["Meal Images"], summary: "Delete a photo (admin gallery)", description: "Admin only. Frees database space; also clears the owning meal's ref so no expiry message is shown.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Deleted — returns { freedBytes }"), "403": ok("Forbidden"), "404": ok("Not found") } },
            },
            "/api/admin/gallery": {
                get: { tags: ["Meal Images"], summary: "Gallery index grouped by day", description: authPerm("users.manage") + " Metadata only (no binaries): `{ days: [{ date, count, totalBytes, images: [...] }], totalCount, totalBytes, ttlDays }`.", security: bearer, responses: { "200": jsonObj, "403": ok("Forbidden") } },
            },
            "/api/measurements": {
                get: { tags: ["Measurements"], summary: "Bioimpedância history", security: bearer, responses: { "200": jsonObj } },
                post: { tags: ["Measurements"], summary: "Add a measurement", description: authPerm("nutrition.edit"), security: bearer, responses: { "200": ok("Added"), "403": ok("Forbidden") } },
            },
            "/api/measurements/{id}": {
                put: { tags: ["Measurements"], summary: "Edit a measurement", description: authPerm("nutrition.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Updated"), "403": ok("Forbidden") } },
                delete: { tags: ["Measurements"], summary: "Delete a measurement", description: authPerm("nutrition.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Deleted"), "403": ok("Forbidden") } },
            },
            "/api/water": {
                put: { tags: ["Water"], summary: "Update water intake/goal", description: authPerm("nutrition.edit"), security: bearer, responses: { "200": ok("Updated"), "403": ok("Forbidden") } },
            },
            "/api/workouts": {
                put: { tags: ["Workout"], summary: "Set/clear a day's workout", description: authPerm("nutrition.edit"), security: bearer, responses: { "200": ok("Updated"), "403": ok("Forbidden") } },
            },
            "/api/routines": {
                get: { tags: ["Routines"], summary: "List routines (active + archived)", description: authPerm("treinos.view"), security: bearer, responses: { "200": jsonObj } },
                post: { tags: ["Routines"], summary: "Create a routine", description: authPerm("treinos.create"), security: bearer, responses: { "200": ok("Created"), "403": ok("Forbidden") } },
            },
            "/api/routines/{id}": {
                put: { tags: ["Routines"], summary: "Edit a routine", description: authPerm("treinos.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Updated"), "403": ok("Forbidden") } },
                delete: { tags: ["Routines"], summary: "Delete a routine (admin only)", description: authPerm("treinos.delete"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Deleted"), "403": ok("Forbidden") } },
            },
            "/api/routines/{id}/archive": {
                post: { tags: ["Routines"], summary: "Archive/restore a routine", description: authPerm("treinos.archive") + " Body: `{ archived: boolean }`.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("OK"), "403": ok("Forbidden") } },
            },
            "/api/diets": {
                get: { tags: ["Diets"], summary: "List diet plans (active first)", description: authPerm("diet.view"), security: bearer, responses: { "200": jsonObj } },
                post: { tags: ["Diets"], summary: "Create a diet plan", description: authPerm("diet.edit") + " Nutritionist + admin. Fields are explicitly mapped; totals recomputed server-side; `active` can only be set via the activate endpoint.", security: bearer, responses: { "200": ok("Created — returns { dietId }"), "400": ok("Validation error"), "403": ok("Forbidden") } },
            },
            "/api/diets/{id}": {
                put: { tags: ["Diets"], summary: "Update a diet plan", description: authPerm("diet.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Updated"), "403": ok("Forbidden"), "404": ok("Not found") } },
                delete: { tags: ["Diets"], summary: "Delete a diet plan", description: authPerm("diet.edit"), security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Deleted"), "403": ok("Forbidden"), "404": ok("Not found") } },
            },
            "/api/diets/{id}/activate": {
                post: { tags: ["Diets"], summary: "Activate/deactivate a plan (max one active)", description: authPerm("diet.edit") + " Body: `{ active: boolean }`. Activating one plan deactivates all others; the active plan appears on the dashboard.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("OK"), "403": ok("Forbidden"), "404": ok("Not found") } },
            },
            "/api/exercises/search": {
                get: { tags: ["Exercises"], summary: "Search exercises (local PT + wger)", security: bearer, parameters: [{ name: "q", in: "query", required: true, schema: { type: "string", example: "supino" } }], responses: { "200": jsonObj } },
            },
            "/api/nutrition/search": {
                get: { tags: ["Nutrition"], summary: "Search foods (Open Food Facts)", security: bearer, parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer" } }], responses: { "200": jsonObj } },
            },
            "/api/nutrition/barcode/{code}": {
                get: { tags: ["Nutrition"], summary: "Food by barcode", security: bearer, parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }], responses: { "200": jsonObj, "404": ok("Not found") } },
            },
            "/api/admin/users": {
                get: { tags: ["Admin"], summary: "List users", description: authPerm("users.manage"), security: bearer, responses: { "200": jsonObj, "403": ok("Forbidden") } },
            },
            "/api/admin/users/{id}": {
                put: { tags: ["Admin"], summary: "Change a user's role/specialty", description: authPerm("users.manage") + " Guards: cannot change your own role; cannot demote the last admin.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { type: "object", required: ["role"], properties: { role: { type: "string", enum: ["admin", "manager", "user"] }, specialty: { type: "string", enum: ["personal_trainer", "nutritionist"], nullable: true } } } } } }, responses: { "200": ok("Updated"), "400": ok("Bad role / guard"), "403": ok("Forbidden") } },
            },
            "/api/settings/login-background": {
                get: { tags: ["Settings"], summary: "Login background image (public)", description: "Public — the login page is pre-auth. 404 when no background is configured.", responses: { "200": { description: "Image binary", content: { "image/jpeg": {}, "image/png": {}, "image/webp": {} } }, "404": ok("No background set") } },
                put: { tags: ["Settings"], summary: "Set/replace the login background", description: "Admin only. Body: `{ dataUrl }` (JPEG/PNG/WebP, ≤ 5 MB, magic-byte validated). Stored WITHOUT TTL — never auto-deleted.", security: bearer, requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["dataUrl"], properties: { dataUrl: { type: "string" } } } } } }, responses: { "200": ok("Saved"), "400": ok("Invalid image"), "403": ok("Forbidden"), "413": ok("Larger than 5 MB") } },
                delete: { tags: ["Settings"], summary: "Remove the login background", description: "Admin only. Login reverts to the plain theme.", security: bearer, responses: { "200": ok("Removed"), "403": ok("Forbidden"), "404": ok("None set") } },
            },
            "/api/settings/privacy": {
                get: { tags: ["Settings"], summary: "Read privacy settings", description: "Any authenticated user. Returns `{ hideWeight }`.", security: bearer, responses: { "200": jsonObj } },
                put: { tags: ["Settings"], summary: "Toggle weight privacy", description: "Admin only. Body `{ hideWeight: boolean }`. When on, `/api/daily` and `/api/measurements` redact the patient's weight to null for plain `user` viewers (admin + managers still see it).", security: bearer, responses: { "200": ok("Saved"), "403": ok("Forbidden") } },
            },
            "/api/exams": {
                get: { tags: ["Exams"], summary: "List exam documents (metadata)", description: authPerm("exams.view") + " Admin sees all; nutricionista/médico see only documents whose `audience` includes their profession. Never returns binaries.", security: bearer, responses: { "200": jsonObj, "403": ok("Forbidden") } },
                post: { tags: ["Exams"], summary: "Upload a document", description: authPerm("exams.edit") + " Admin only. `multipart/form-data` with a `file` part + optional `title`/`category`/`examDate`/`notes` and one or more `audience` parts (`medico`, `nutritionist`) choosing who may see it (default both). Stored in GridFS; 50 MB cap.", security: bearer, requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" }, title: { type: "string" }, category: { type: "string" }, examDate: { type: "string" }, notes: { type: "string" }, audience: { type: "array", items: { type: "string", enum: ["medico", "nutritionist"] } } } } } } }, responses: { "200": ok("Uploaded — returns { id, size }"), "400": ok("No file"), "403": ok("Forbidden"), "413": ok("Larger than 50 MB") } },
            },
            "/api/exams/{id}": {
                get: { tags: ["Exams"], summary: "Stream/preview a document", description: authPerm("exams.view") + " A nutricionista/médico can only fetch documents targeted to them (else 404). Safe types (PDF/image/text) stream inline; everything else — and `?download=1` — is a forced attachment. Always `nosniff` + `sandbox` CSP + `no-store`.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "download", in: "query", schema: { type: "string" }, description: "Any value forces an attachment download" }], responses: { "200": { description: "File stream" }, "403": ok("Forbidden"), "404": ok("Not found or not targeted to you") } },
                put: { tags: ["Exams"], summary: "Edit document metadata", description: authPerm("exams.edit") + " Body: title/category/examDate/notes.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Updated"), "403": ok("Forbidden"), "404": ok("Not found") } },
                delete: { tags: ["Exams"], summary: "Delete a document", description: authPerm("exams.edit") + " Admin only. Removes the GridFS file + chunks.", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("Deleted"), "403": ok("Forbidden"), "404": ok("Not found") } },
            },
            "/api/health": {
                get: { tags: ["Health"], summary: "Service health (public)", responses: { "200": jsonObj } },
            },
        },
    };
}
