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
  return sandbox ? "https://sandbox-api.vcgamers.com" : "https://api.vcgamers.com";
}

function candidatesBalance() {
  const p = env("VCGAMERS_BALANCE_PATH") || "/v1/balance";
  // Unique list preserving order
  return Array.from(new Set([p, "/v2/balance", "/v2/wallet/balance", "/v1/balance"]));
}

function candidatesPricelist() {
  const p = env("VCGAMERS_PRICELIST_PATH") || "/v1/pricelist";
  return Array.from(new Set([p, "/v2/pricelist", "/v2/products/pricelist", "/v2/product/pricelist", "/v1/pricelist"]));
}

function authHeaders() {
  const apiKey = env("VCGAMERS_API_KEY");
  if (!apiKey) throw new Error("Set VCGAMERS_API_KEY in env or .env.local");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
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
  const headers = authHeaders();
  console.log(`\n== ${category.toUpperCase()} CHECKS ==`);
  console.log("Base:", urlBase);
  for (const p of paths) {
    const url = urlBase + p;
    console.log(`\nGET ${url}`);
    const r = await fetchWithTimeout(url, { method: "GET", headers, cache: "no-store" });
    if (r.error) {
      console.log(`ERROR after ${r.ms}ms ->`, r.error.name || "Error", r.error.code || "", r.error.message || r.error);
      continue;
    }
    console.log(`STATUS ${r.status} in ${r.ms}ms`);
    if (!r.ok) {
      console.log("Body:", preview(r.body));
      continue;
    }
    // Try parse
    let data = null;
    try { data = JSON.parse(r.body || "{}"); } catch {}
    if (category === "balance") {
      const bal = Number(data?.data?.balance ?? data?.balance ?? 0);
      console.log("Balance:", bal, "Raw:", preview(r.body));
    } else if (category === "pricelist") {
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      console.log("Items:", Array.isArray(list) ? list.length : 0, "Raw:", preview(r.body));
    } else {
      console.log("Body:", preview(r.body));
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
