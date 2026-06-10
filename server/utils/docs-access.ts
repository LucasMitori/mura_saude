import type { H3Event } from "h3";

// Gate the API docs. Open in development; in production they require
// ?token=<API_DOCS_TOKEN> (or an `x-docs-token` header) and are disabled
// entirely when API_DOCS_TOKEN is unset. Returns 404 (not 403) so the docs'
// existence isn't even revealed without the token.
export function assertDocsAccess(event: H3Event): void {
    if (import.meta.dev) return;

    const token = (useRuntimeConfig().apiDocsToken as string) || "";
    const provided =
        (getQuery(event).token as string) ||
        getHeader(event, "x-docs-token") ||
        "";

    if (!token || provided !== token) {
        throw createError({ statusCode: 404, message: "Not found" });
    }
}
