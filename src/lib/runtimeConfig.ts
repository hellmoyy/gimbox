// Centralized runtime config. Fill the values below to hardcode configuration.
// This will be used as the primary source instead of process.env in critical code paths.

export const NEXTAUTH_URL = ""; // e.g., https://your-domain
export const NEXTAUTH_SECRET = ""; // e.g., a strong random string

export const GOOGLE_CLIENT_ID = "";
export const GOOGLE_CLIENT_SECRET = "";

export const MONGODB_URI = ""; // e.g., mongodb+srv://user:pass@cluster/... 
export const MONGO_TIMEOUT_MS = 8000;
export const MONGO_DIRECT = false;

export const AUTH_SECRET = "dev"; // admin guard secret; replace in production

export const MIDTRANS_SERVER_KEY = "";
export const MIDTRANS_CLIENT_KEY = "";
export const MIDTRANS_IS_PRODUCTION = false;

export const VCGAMERS_API_KEY = "";
export const VCGAMERS_SECRET_KEY = "";
export const VCGAMERS_SANDBOX = true;
