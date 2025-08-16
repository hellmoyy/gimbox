import { MongoClient, MongoClientOptions, Db } from "mongodb";
import { MONGODB_URI as CFG_URI, MONGO_TIMEOUT_MS, MONGO_DIRECT } from "./runtimeConfig";

// Lazily connect on first use; avoid connecting at import time to reduce noisy failures in dev
const cfgUri: string | undefined = typeof CFG_URI === "string" && CFG_URI.length ? CFG_URI : undefined;
const uri = (cfgUri ? cfgUri.trim() : undefined) || (process.env.MONGODB_URI as string | undefined);
if (!uri) {
  // Do not throw at import time in Next.js; runtime checks will handle
  console.warn("[mongodb] MONGODB_URI is not set");
}

const options: MongoClientOptions = {
  // Be a bit more tolerant in production environments like Railway
  serverSelectionTimeoutMS: Number(MONGO_TIMEOUT_MS ?? process.env.MONGO_TIMEOUT_MS ?? 8000),
  // Hint: for some providers direct connection can help; safe to leave undefined otherwise
  directConnection:
    typeof MONGO_DIRECT === "boolean"
      ? (MONGO_DIRECT as boolean)
      : process.env.MONGO_DIRECT === "true"
        ? true
        : undefined,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getDb(dbName = "topupsaas"): Promise<Db> {
  if (!global._mongoClientPromise) {
    if (!uri) {
      throw new Error("MONGODB_URI is not configured");
    }
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  const client = await global._mongoClientPromise;
  return client.db(dbName);
}
