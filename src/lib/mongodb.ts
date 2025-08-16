import { MongoClient, MongoClientOptions, Db } from "mongodb";

// Lazily connect on first use; avoid connecting at import time to reduce noisy failures in dev
const uri = process.env.MONGODB_URI as string | undefined;
if (!uri) {
  // Do not throw at import time in Next.js; runtime checks will handle
  console.warn("[mongodb] MONGODB_URI is not set");
}

const options: MongoClientOptions = {
  // Be a bit more tolerant in production environments like Railway
  serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 8000),
  // Hint: for some providers direct connection can help; safe to leave undefined otherwise
  directConnection: process.env.MONGO_DIRECT === "true" ? true : undefined,
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
