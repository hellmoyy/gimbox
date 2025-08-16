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

// Xendit
export const XENDIT_SECRET_KEY = "xnd_development_7liXQJWUZo49BvnjYhzKoa5MlqJ44e1yvqjNmzHcZftdYbLcyWUzVGoYL5018"; // e.g., xnd_development_...
export const XENDIT_PUBLIC_KEY = "xnd_public_development_2pD186YL0boCsW69gP6tZJzXrdgWeqBPPCCLvaRmZO1It2lr8eF5vJDHqdRqcsd"; // optional
export const XENDIT_IS_PRODUCTION = false;

// Moota
export const MOOTA_API_KEY = ""; // set via ENV or settings; sandbox key supported
export const MOOTA_IS_SANDBOX = true;
export const MOOTA_WEBHOOK_TOKEN = ""; // optional: set to verify incoming webhook via header
