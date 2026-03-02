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

    try {
        const client = new MongoClient(uri);
        await client.connect();

        cachedClient = client;
        cachedDb = client.db("mura_saude");

        return cachedDb;
    } catch (error: unknown) {
        cachedClient = null;
        cachedDb = null;

        const message =
            error instanceof Error ? error.message : "Unknown database error";
        console.error("[MongoDB] Connection failed:", message);

        throw createError({
            statusCode: 500,
            message: `Database connection failed: ${message}`,
        });
    }
}
