import { assertDocsAccess } from "#server/utils/docs-access";
import { getOpenApiSpec } from "#server/utils/openapi";

// GET /api/docs/openapi — the OpenAPI 3 spec (JSON). Gated in production.
export default defineEventHandler((event) => {
    assertDocsAccess(event);
    setHeader(event, "Content-Type", "application/json; charset=utf-8");
    setHeader(event, "X-Robots-Tag", "noindex, nofollow");
    return getOpenApiSpec();
});
