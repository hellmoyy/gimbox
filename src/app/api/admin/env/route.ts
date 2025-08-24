import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminRequest } from '@/lib/adminAuth';

// TEMPORARY: Environment diagnostics endpoint (admin only).
// Remove after debugging. Do NOT expose secrets publicly.
// Query params:
//   raw=1 -> include raw values for non-sensitive keys (public allowlist)
//   include=KEY1,KEY2 -> additional specific keys (will be sanitized unless also in allowlist)

const PUBLIC_ALLOWLIST_PREFIXES = ['NEXT_PUBLIC_'];
const EXTRA_PUBLIC_KEYS = [
  'R2_PUBLIC_BASE',
  'VCGAMERS_PRICELIST_PATH',
  'VCGAMERS_BASE_URL',
  'PRODUCT_PLACEHOLDER_URL'
];

// Keys considered sensitive (only presence / length shown)
const SENSITIVE_HINT_KEYS = [
  'MONGODB_URI','MIDTRANS_SERVER_KEY','MIDTRANS_CLIENT_KEY','MIDTRANS_MERCHANT_ID','MIDTRANS_IS_PRODUCTION',
  'AUTH_SECRET','ADMIN_USER','ADMIN_PASS','DIGIFLAZZ_BUYER_API_KEY','DIGIFLAZZ_BUYER_USERNAME',
  'IAK_API_KEY','IAK_SECRET','IAK_USERNAME','IAK_SANDBOX','XENDIT_SECRET_KEY','RAPIDAPI_KEY',
  'R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_ACCOUNT_ID','R2_ENDPOINT',
  'VCGAMERS_API_KEY','VCGAMERS_SECRET_KEY','VCGAMERS_SANDBOX','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'
];

function isPublicKey(k: string) {
  return PUBLIC_ALLOWLIST_PREFIXES.some(p=>k.startsWith(p)) || EXTRA_PUBLIC_KEYS.includes(k);
}

export async function GET(req: NextRequest) {
  if (!ensureAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('raw') === '1' || searchParams.get('raw') === 'true';
  const includeParam = searchParams.get('include');
  const includeExtra = includeParam ? includeParam.split(',').map(s=>s.trim()).filter(Boolean) : [];

  const result: Record<string, any> = {};
  const envKeys = Object.keys(process.env).sort();
  for (const key of envKeys) {
    if (isPublicKey(key)) {
      const val = process.env[key] ?? '';
      result[key] = raw ? val : { value: val };
      continue;
    }
    if (SENSITIVE_HINT_KEYS.includes(key) || includeExtra.includes(key)) {
      const val = process.env[key];
      if (val == null) {
        result[key] = { present: false };
      } else {
        result[key] = { present: true, length: val.length };
      }
    }
  }
  // Summaries
  const summary = {
    totalKeys: envKeys.length,
    publicKeys: Object.keys(result).filter(k=>isPublicKey(k)).length,
    sensitiveReported: Object.keys(result).filter(k=>!isPublicKey(k)).length,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json({ success: true, summary, env: result, note: 'TEMP endpoint – hapus setelah verifikasi. Gunakan ?raw=1 untuk nilai publik.' });
}
