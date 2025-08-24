import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.warn('[update-devpub] MONGODB_URI not set');
}

let _clientPromise;
export async function getDb(dbName = 'topupsaas') {
  if (!_clientPromise) {
    if (!uri) throw new Error('MONGODB_URI missing');
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 8000),
      directConnection: process.env.MONGO_DIRECT === 'true' ? true : undefined,
    });
    _clientPromise = client.connect();
  }
  const client = await _clientPromise;
  return client.db(dbName);
}
