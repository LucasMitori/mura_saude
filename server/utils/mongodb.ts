import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDatabase(): Promise<Db> {
    if (cachedDb) return cachedDb;

    const config = useRuntimeConfig();
    const uri = config.mongodbUri;

    if (!uri) {
        throw createError({
            statusCode: 500,
            message: "MONGODB_URI is not configured",
        });
    }

    // TLS handshakes to Atlas occasionally fail transiently on this machine
    // (local AV/proxy interception — see README). One quick retry absorbs
    // those blips instead of surfacing a 500 to the user.
    const ATTEMPTS = 2;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        let client: MongoClient | null = null;
        try {
            client = new MongoClient(uri, {
                serverSelectionTimeoutMS: 8000,
            });
            await client.connect();

            cachedClient = client;
            cachedDb = client.db("mura_saude");

            return cachedDb;
        } catch (error: unknown) {
            lastError = error;
            cachedClient = null;
            cachedDb = null;
            await client?.close().catch(() => {});
            const message =
                error instanceof Error ? error.message : "Unknown database error";
            console.error(
                `[MongoDB] Connection attempt ${attempt}/${ATTEMPTS} failed:`,
                message,
            );
            if (attempt < ATTEMPTS) {
                await new Promise((r) => setTimeout(r, 300));
            }
        }
    }

    const message =
        lastError instanceof Error ? lastError.message : "Unknown database error";
    throw createError({
        statusCode: 500,
        message: `Database connection failed: ${message}`,
    });
}
