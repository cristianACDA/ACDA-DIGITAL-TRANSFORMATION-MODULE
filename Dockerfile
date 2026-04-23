# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════════════════════════
# CTD — ACDA Digital Transformation Module (Cloud Run europe-west1)
# v0.2.0-cloudsql: Cloud SQL unix socket via --add-cloudsql-instances.
# No Tailscale sidecar. Platform: linux/amd64 (Cloud Run = x86_64).
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Stage 1: Builder (npm ci + vite build → dist/) ──────────────────────────
FROM --platform=linux/amd64 node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig*.json vite.config.ts eslint.config.js index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-slim AS runtime
WORKDIR /app

# ca-certificates pentru TLS outbound (GoogleAPIs, OpenAPI, etc.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force \
 && rm -rf /root/.npm

# Frontend build output + source TS pentru tsx runtime
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY database ./database

# Entrypoint (no sidecars)
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production \
    PORT=8080

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
