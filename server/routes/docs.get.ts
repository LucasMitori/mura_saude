import { assertDocsAccess } from "#server/utils/docs-access";

// GET /docs — Swagger UI. Open in development; in production requires
// ?token=<API_DOCS_TOKEN> (disabled entirely if the token is unset).
export default defineEventHandler((event) => {
    assertDocsAccess(event);

    const token = (getQuery(event).token as string) || "";
    const specUrl = token
        ? `/api/docs/openapi?token=${encodeURIComponent(token)}`
        : "/api/docs/openapi";

    setHeader(event, "Content-Type", "text/html; charset=utf-8");
    setHeader(event, "X-Robots-Tag", "noindex, nofollow");

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Mura Saúde API — Documentação</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>body { margin: 0; background: #fafafa; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify(specUrl)},
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      deepLinking: true,
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`;
});
