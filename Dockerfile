# Multi-stage Dockerfile for Next.js (no GHCR dependency)

# 1) Builder: install deps and build
FROM node:20-alpine AS builder
WORKDIR /app

# Sharp on Alpine needs this for compatibility
RUN apk add --no-cache libc6-compat

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copy the rest and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# 2) Runner: minimal runtime using Next standalone output
FROM node:20-alpine AS runner
WORKDIR /app

# Sharp runtime compatibility
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Copy standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# If your app needs extra runtime files (e.g., .env.production), copy them here
# COPY .env.production ./.env.production

CMD ["node", "server.js"]
