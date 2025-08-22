// Centralized runtime config. Fill the values below to hardcode configuration.
// This will be used as the primary source instead of process.env in critical code paths.

export const NEXTAUTH_URL = ""; // e.g., https://your-domain
export const NEXTAUTH_SECRET = ""; // e.g., a strong random string

export const GOOGLE_CLIENT_ID = "";
export const GOOGLE_CLIENT_SECRET = "";

export const MONGODB_URI = ""; // e.g., mongodb+srv://user:pass@cluster/... 
export const MONGO_TIMEOUT_MS = 8000;
export const MONGO_DIRECT = false;

// Admin guard secret; MUST be set to a strong random string in production (via ENV or here).
// Using the default in production will be blocked by middleware.
export const AUTH_SECRET = process.env.NODE_ENV === "production" ? "" : "dev";

// Duitku payment gateway config
export const DUITKU_MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || "";
export const DUITKU_API_KEY = process.env.DUITKU_API_KEY || "";
export const DUITKU_SANDBOX = process.env.DUITKU_SANDBOX === "true";

export const MIDTRANS_SERVER_KEY = "";
export const MIDTRANS_CLIENT_KEY = "";
export const MIDTRANS_IS_PRODUCTION = false;

export const VCGAMERS_API_KEY = "";
export const VCGAMERS_SECRET_KEY = "";
export const VCGAMERS_SANDBOX = true;

// Xendit (do NOT hardcode real keys in repo). Leave blank to use process.env or DB settings.
export const XENDIT_SECRET_KEY = ""; // e.g., xnd_development_...
export const XENDIT_PUBLIC_KEY = ""; // optional
export const XENDIT_IS_PRODUCTION = false;

// Moota
export const MOOTA_API_KEY = ""; // set via ENV or settings; sandbox key supported
export const MOOTA_IS_SANDBOX = true;
export const MOOTA_WEBHOOK_TOKEN = ""; // optional: set to verify incoming webhook via header

// Feature flags
// Enable/disable the Gamification (GimPet/GimPlay) feature globally.
// Can be overridden via NEXT_PUBLIC_GAMIFICATION_ENABLED env ("true"/"false").
export const GAMIFICATION_ENABLED: boolean = (() => {
	const v = (process.env.NEXT_PUBLIC_GAMIFICATION_ENABLED || "").toLowerCase().trim();
	if (v === "true") return true;
	if (v === "false") return false;
	return true; // default ON
})();
