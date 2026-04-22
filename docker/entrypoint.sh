#!/bin/sh
# CTD Cloud Run entrypoint — Tailscale sidecar userspace + tsx runtime.
# TS_AUTHKEY injected via --set-secrets=TS_AUTHKEY=ctd-ts-authkey:latest
# CTD_SKIP_TAILSCALE=1 → bypass Tailscale bring-up (local docker test fără DGX reach)
set -e

if [ "${CTD_SKIP_TAILSCALE}" = "1" ]; then
  echo "[entrypoint] CTD_SKIP_TAILSCALE=1 → bypass Tailscale sidecar (local test mode)"
else
  if [ -z "${TS_AUTHKEY}" ]; then
    echo "[entrypoint] FATAL: TS_AUTHKEY not set (required for Tailscale sidecar)"
    exit 1
  fi

  echo "[entrypoint] Starting tailscaled userspace networking"
  /usr/local/bin/tailscaled \
    --tun=userspace-networking \
    --socks5-server=localhost:1055 \
    --outbound-http-proxy-listen=localhost:1055 \
    --state="${TS_STATE_DIR:-/tmp}/tailscaled.state" \
    --socket="${TS_SOCKET:-/tmp/tailscaled.sock}" &

  # Așteaptă socket ready (max 10s)
  i=0
  while [ $i -lt 10 ]; do
    [ -S "${TS_SOCKET:-/tmp/tailscaled.sock}" ] && break
    sleep 1
    i=$((i+1))
  done

  if [ ! -S "${TS_SOCKET:-/tmp/tailscaled.sock}" ]; then
    echo "[entrypoint] FATAL: tailscaled socket not ready after 10s"
    exit 1
  fi

  echo "[entrypoint] tailscale up as ctd-cloudrun (ephemeral)"
  /usr/local/bin/tailscale \
    --socket="${TS_SOCKET:-/tmp/tailscaled.sock}" \
    up \
    --authkey="${TS_AUTHKEY}" \
    --hostname=ctd-cloudrun \
    --accept-routes

  # HTTP/HTTPS proxy pentru orice client care respectă ALL_PROXY.
  # Cloud Run n-are CAP_NET_ADMIN → no TUN real; tailscaled în userspace-networking
  # expune DOAR SOCKS5/HTTP CONNECT pe :1055, NU rutează TCP direct la IP-uri tailnet.
  export ALL_PROXY="socks5://localhost:1055"
  export HTTP_PROXY="http://localhost:1055"
  export HTTPS_PROXY="http://localhost:1055"
  export NO_PROXY="localhost,127.0.0.1,metadata.google.internal,metadata"

  # socat TCP relay: pg face TCP direct, nu respectă ALL_PROXY.
  # Local bind 127.0.0.1:${TS_PG_LOCAL_PORT} → HTTP CONNECT tailscaled → DGX :5432.
  # HTTP CONNECT (PROXY: în socat) funcționează pe socat 1.7.x (Debian bookworm);
  # SOCKS5 nativ e doar în socat 2.x. Tailscaled expune ambele pe :1055.
  TS_PG_REMOTE_HOST="${TS_PG_REMOTE_HOST:-100.93.193.85}"
  TS_PG_REMOTE_PORT="${TS_PG_REMOTE_PORT:-5432}"
  TS_PG_LOCAL_PORT="${TS_PG_LOCAL_PORT:-15432}"
  echo "[entrypoint] socat relay 127.0.0.1:${TS_PG_LOCAL_PORT} → HTTP-CONNECT(127.0.0.1:1055) → ${TS_PG_REMOTE_HOST}:${TS_PG_REMOTE_PORT}"
  socat -d \
    "TCP-LISTEN:${TS_PG_LOCAL_PORT},fork,reuseaddr,bind=127.0.0.1" \
    "PROXY:127.0.0.1:${TS_PG_REMOTE_HOST}:${TS_PG_REMOTE_PORT},proxyport=1055" &

  # socat listener bind-uiește sincron la fork; un sleep scurt e suficient.
  sleep 2
  echo "[entrypoint] socat relay active (bg pid ready)"
fi

echo "[entrypoint] Starting CTD backend (tsx) on PORT=${PORT:-8080}"
exec ./node_modules/.bin/tsx server/index.ts
