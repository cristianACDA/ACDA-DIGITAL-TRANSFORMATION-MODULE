# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════════════════════════
# CTD — ACDA Digital Transformation Module (Cloud Run europe-west1)
# Multi-stage: Tailscale sidecar binaries + Vite dist + tsx runtime
# Platform: linux/amd64 (Cloud Run = x86_64; Mac M-series = ARM64 → hard fix)
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Stage 1: Tailscale binaries ──────────────────────────────────────────────
FROM --platform=linux/amd64 alpine:3.20 AS tailscale
ARG TSVERSION=1.96.4
RUN apk add --no-cache curl ca-certificates tar \
 && curl -fsSL -o /tmp/ts.tgz \
      "https://pkgs.tailscale.com/stable/tailscale_${TSVERSION}_amd64.tgz" \
 && mkdir -p /out \
 && tar -xzf /tmp/ts.tgz -C /out --strip-components=1 \
 && ls -la /out/tailscale /out/tailscaled

# ─── Stage 2: Builder (npm ci + vite build → dist/) ───────────────────────────
FROM --platform=linux/amd64 node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig*.json vite.config.ts eslint.config.js index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-slim AS runtime
WORKDIR /app

# ca-certificates (TLS) + iptables (Tailscale userspace)
# pg e pure JS → zero compile toolchain necesar
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates iptables \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force \
 && rm -rf /root/.npm

# Frontend build output + source TS pentru tsx runtime
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY database ./database

# Tailscale sidecar
COPY --from=tailscale /out/tailscale /usr/local/bin/tailscale
COPY --from=tailscale /out/tailscaled /usr/local/bin/tailscaled

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production \
    PORT=8080 \
    TS_STATE_DIR=/tmp \
    TS_SOCKET=/tmp/tailscaled.sock

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
