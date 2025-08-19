// Local diagnostics for VcGamers API connectivity and paths
// Usage:
//   VCGAMERS_API_KEY=xxx node scripts/test-vcgamers.mjs
// Optional env:
//   VCGAMERS_SECRET_KEY, VCGAMERS_BASE_URL, VCGAMERS_SANDBOX=true,
//   VCGAMERS_PRICELIST_PATH, VCGAMERS_BALANCE_PATH, TIMEOUT_MS

/* eslint-disable no-console */

// Lightweight .env loader for Node scripts (supports .env.local and .env)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function loadDotEnvFiles() {
  const root = process.cwd();
  const files = [
    path.join(root, '.env.local'),
    path.join(root, '.env'),
  ];
  for (const file of files) {
    try {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        if (!line || /^\s*#/.test(line)) continue;
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2];
        // Trim surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = val;
      }
    } catch {}
  }
}

loadDotEnvFiles();

const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 15000);

function env(name, def = "") {
  const v = process.env[name];
  return typeof v === "string" && v.length ? v : def;
}

function baseUrl() {
  const override = env("VCGAMERS_BASE_URL").trim();
  if (override) return override.replace(/\/$/, "");
  const sandbox = env("VCGAMERS_SANDBOX").toLowerCase() === "true";
  return sandbox ? "https://sandbox-api.vcgamers.com" : "https://mitra-api.vcgamers.com";
}

function candidatesBalance() {
  const p = env("VCGAMERS_BALANCE_PATH") || "/v1/balance";
  // Unique list preserving order
  return Array.from(new Set([p, "/v1/public/balance", "/v2/balance", "/v2/wallet/balance", "/v1/balance"]));
}

function candidatesPricelist() {
  const p = env("VCGAMERS_PRICELIST_PATH") || "/v1/pricelist";
  return Array.from(new Set([p, "/v1/public/pricelist", "/v2/pricelist", "/v2/products/pricelist", "/v2/product/pricelist", "/v1/pricelist"]));
}

function authHeaderVariants() {
  const apiKey = env("VCGAMERS_API_KEY");
  if (!apiKey) throw new Error("Set VCGAMERS_API_KEY in env or .env.local");
  return [
    { name: 'Bearer', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${apiKey}` } },
    { name: 'X-Api-Key', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Api-Key': apiKey } },
  ];
}

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error("timeout")), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const ms = Date.now() - started;
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, ms, body: text, headers: Object.fromEntries(res.headers.entries()) };
  } catch (e) {
    const ms = Date.now() - started;
    const err = e && typeof e === "object" ? e : { message: String(e) };
    return { ok: false, error: err, status: 0, ms };
  } finally {
    clearTimeout(id);
  }
}

function preview(str, n = 300) {
  if (!str) return "";
  return String(str).slice(0, n).replace(/\n/g, " ");
}

async function probe(category, paths) {
  const urlBase = baseUrl();
  console.log(`\n== ${category.toUpperCase()} CHECKS ==`);
  console.log("Base:", urlBase);
  for (const p of paths) {
    const url = urlBase + p;
    for (const hv of authHeaderVariants()) {
      console.log(`\nGET ${url} [${hv.name}]`);
      const r = await fetchWithTimeout(url, { method: 'GET', headers: hv.headers, cache: 'no-store' });
      if (r.error) {
        console.log(`ERROR after ${r.ms}ms ->`, r.error.name || 'Error', r.error.code || '', r.error.message || r.error);
        continue;
      }
      console.log(`STATUS ${r.status} in ${r.ms}ms`);
      if (!r.ok) {
        console.log('Body:', preview(r.body));
        continue;
      }
      let data = null;
      try { data = JSON.parse(r.body || '{}'); } catch {}
      if (category === 'balance') {
        const bal = Number(data?.data?.balance ?? data?.balance ?? 0);
        console.log('Balance:', bal, 'Raw:', preview(r.body));
      } else if (category === 'pricelist') {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        console.log('Items:', Array.isArray(list) ? list.length : 0, 'Raw:', preview(r.body));
      } else {
        console.log('Body:', preview(r.body));
      }
    }
  }
}

function getSecretOrNull() {
  const v = env('VCGAMERS_SECRET_KEY');
  return v && v.length ? v : null;
}

function makeSignatures(secret, path, body, ts) {
  const candidatesRaw = [
    body,
    ts,
    body + ts,
    ts + body,
    path + ts + body,
    path + body + ts,
  ].map((s) => (typeof s === 'string' ? s : JSON.stringify(s)));
  const sigs = Array.from(new Set(candidatesRaw.map((p) => crypto.createHmac('sha256', secret).update(p || '').digest('hex'))));
  return sigs;
}

async function probeSignedPublicBalance() {
  const secret = getSecretOrNull();
  const apiKey = env('VCGAMERS_API_KEY');
  const b = baseUrl();
  const p = '/v1/public/balance';
  const url = b + p;
  console.log(`\n== SIGNED PUBLIC BALANCE POST ==`);
  console.log('Base:', b);
  if (!secret) {
    console.log('Skip: VCGAMERS_SECRET_KEY not set');
    return;
  }
  if (!apiKey) {
    console.log('Skip: VCGAMERS_API_KEY not set');
    return;
  }
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodies = [
    {},
    { timestamp: ts },
  ];
  const headerNameVariants = ['X-Signature', 'Signature'];
  const includeTimestampHeader = [false, true];
  for (const body of bodies) {
    const payload = JSON.stringify(body);
    const sigs = makeSignatures(secret, p, payload, ts);
    for (const sig of sigs.slice(0, 6)) { // limit attempts per body
      for (const signHeader of headerNameVariants) {
        for (const withTs of includeTimestampHeader) {
          const headersBase = [
            { name: 'POST-X-Api-Key', headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey } },
            { name: 'POST-Bearer', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } },
          ];
          for (const hb of headersBase) {
            const headers = { ...hb.headers, [signHeader]: sig };
            if (withTs) headers['X-Timestamp'] = ts;
            console.log(`\nPOST ${url} [${hb.name} + ${signHeader}${withTs ? ' + X-Timestamp' : ''}] body=${JSON.stringify(body)}`);
            const r = await fetchWithTimeout(url, { method: 'POST', headers, body: payload, cache: 'no-store' });
            if (r.error) {
              console.log(`ERROR after ${r.ms}ms ->`, r.error.name || 'Error', r.error.code || '', r.error.message || r.error);
              continue;
            }
            console.log(`STATUS ${r.status} in ${r.ms}ms`);
            if (!r.ok) {
              console.log('Body:', preview(r.body));
              continue;
            }
            console.log('OK:', preview(r.body));
            return;
          }
        }
      }
    }
  }
}

async function probeSignedGetPublicBalance() {
  const secret = getSecretOrNull();
  const apiKey = env('VCGAMERS_API_KEY');
  const b = baseUrl();
  const p = '/v1/public/balance';
  const url = b + p;
  console.log(`\n== SIGNED PUBLIC BALANCE GET ==`);
  console.log('Base:', b);
  if (!secret) {
    console.log('Skip: VCGAMERS_SECRET_KEY not set');
    return;
  }
  if (!apiKey) {
    console.log('Skip: VCGAMERS_API_KEY not set');
    return;
  }
  const ts = Math.floor(Date.now() / 1000).toString();
  const payloads = ['', ts, p + ts, ts + p, `${ts}:${p}`, `${p}:${ts}`];
  const sigHeaderNames = ['X-Signature', 'Signature'];
  const tsHeaderNames = [null, 'X-Timestamp', 'Timestamp'];
  const authVariants = [
    { name: 'GET-X-Api-Key', headers: { 'X-Api-Key': apiKey } },
    { name: 'GET-Bearer', headers: { Authorization: `Bearer ${apiKey}` } },
  ];
  const sigEncoders = [
    { name: 'hex', fn: (s) => crypto.createHmac('sha256', secret).update(s).digest('hex') },
    { name: 'HEX', fn: (s) => crypto.createHmac('sha256', secret).update(s).digest('hex').toUpperCase() },
    { name: 'base64', fn: (s) => crypto.createHmac('sha256', secret).update(s).digest('base64') },
  ];
  const includeContentType = [false, true];
  const urlVariants = [url, `${url}?timestamp=${ts}`];
  for (const u of urlVariants) {
    for (const payload of payloads) {
      for (const sigEnc of sigEncoders) {
        const sig = sigEnc.fn(payload);
        for (const sigHeader of sigHeaderNames) {
          for (const tsHeader of tsHeaderNames) {
            for (const auth of authVariants) {
              for (const ct of includeContentType) {
                const headers = { Accept: 'application/json', ...auth.headers, [sigHeader]: sig };
                if (tsHeader) headers[tsHeader] = ts;
                if (ct) headers['Content-Type'] = 'application/json';
                console.log(`\nGET ${u} [${auth.name} + ${sigHeader}${tsHeader ? ' + ' + tsHeader : ''} + ${sigEnc.name}${ct ? ' + CT' : ''}] payload='${payload || '<empty>'}'`);
                const r = await fetchWithTimeout(u, { method: 'GET', headers, cache: 'no-store' });
                if (r.error) {
                  console.log(`ERROR after ${r.ms}ms ->`, r.error.name || 'Error', r.error.code || '', r.error.message || r.error);
                  continue;
                }
                console.log(`STATUS ${r.status} in ${r.ms}ms`);
                console.log('Body:', preview(r.body));
                if (r.ok) return; // stop on first success
              }
            }
          }
        }
      }
    }
  }
}

async function main() {
  console.log("VCGamers diagnostics starting...");
  try {
    await probe("balance", candidatesBalance());
  } catch (e) {
    console.log("Balance probe error:", e?.message || e);
  }
  try {
    await probeSignedGetPublicBalance();
  } catch (e) {
    console.log("Signed GET balance probe error:", e?.message || e);
  }
  try {
    await probeSignedPublicBalance();
  } catch (e) {
    console.log("Signed balance probe error:", e?.message || e);
  }
  try {
    await probe("pricelist", candidatesPricelist());
  } catch (e) {
    console.log("Pricelist probe error:", e?.message || e);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exitCode = 1;
});
