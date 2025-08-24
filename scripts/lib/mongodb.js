import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

let loadedEnv = false;
function loadDotEnvOnce() {
  if (loadedEnv) return;
  loadedEnv = true;
  if (process.env.MONGODB_URI) return;
  for (const file of ['.env.local', '.env']) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    try {
      const txt = fs.readFileSync(p, 'utf-8');
      for (const line of txt.split(/\r?\n/)) {
        if (!line || line.startsWith('#')) continue;
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
        if (process.env[m[1]] === undefined) process.env[m[1]] = val;
      }
      if (process.env.MONGODB_URI) break;
    } catch {}
  }
}

let _clientPromise;
export function setMongoUri(uri) {
  process.env.MONGODB_URI = uri;
  // reset client if already connected with different URI
  if (_clientPromise) {
    _clientPromise = undefined;
  }
}

export async function getDb(dbName = 'topupsaas') {
  loadDotEnvOnce();
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    // Fallback default local for convenience
    uri = 'mongodb://localhost:27017/topupsaas';
    console.warn('[mongodb-helper] MONGODB_URI not set. Using fallback: mongodb://localhost:27017/topupsaas');
    process.env.MONGODB_URI = uri;
  }
  if (!_clientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 8000),
      directConnection: process.env.MONGO_DIRECT === 'true' ? true : undefined,
    });
    _clientPromise = client.connect().catch(e=>{ _clientPromise = undefined; throw e; });
  }
  const client = await _clientPromise;
  return client.db(dbName);
}
