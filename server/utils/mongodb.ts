import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDatabase(): Promise<Db> {
    if (cachedDb) return cachedDb;

    const config = useRuntimeConfig();
    const uri = config.mongodbUri;

    if (!uri) throw new Error("MONGODB_URI is not configured");

    const client = new MongoClient(uri);
    await client.connect();

    cachedClient = client;
    cachedDb = client.db("mura_saude");

    return cachedDb;
}
