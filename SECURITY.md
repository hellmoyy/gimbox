# Security Guide

This project includes baseline hardening. Operators should review and configure the following before production:

- Secrets
  - Set AUTH_SECRET, NEXTAUTH_SECRET, database URI, and gateway/provider keys via environment variables or secure settings. Never commit real keys.
  - In production, the server refuses admin access when AUTH_SECRET is unset or default.

- Admin Auth
  - Admin passwords are hashed with scrypt + random salt. Admin session cookie is httpOnly and secure in production.
  - Middleware protects /admin routes with AUTH_SECRET cookie guard.

- Uploads
  - SVG uploads are sanitized (scripts and event handlers removed). Raster images resized and normalized.

- Webhooks
  - Moota token header is checked. Add signature verification for Midtrans and Xendit before going live.

- Pricing integrity
  - Gateway fees are computed server-side using Active Payments config to avoid client tampering.

- Headers
  - Basic security headers and a conservative CSP are set in next.config.ts. Adjust origins as needed.

Report issues privately and rotate any exposed credentials immediately.
