export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook("error", (error) => {
        const statusCode = (error as { statusCode?: number }).statusCode || 500;
        if (statusCode >= 500) {
            console.error("[server-error]", error);
        }
    });

    nitroApp.hooks.hook("beforeResponse", (event, response) => {
        const body = response.body as unknown;
        if (
            process.env.NODE_ENV === "production" &&
            body &&
            typeof body === "object" &&
            "stack" in (body as Record<string, unknown>)
        ) {
            delete (body as Record<string, unknown>).stack;
            const status = (body as { statusCode?: number }).statusCode || 500;
            if (status >= 500) {
                (body as Record<string, unknown>).message = "Internal server error";
            }
        }
    });
});
