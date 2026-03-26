#!/bin/bash
# SENTINEL OpenClaw Gateway Watchdog
# Checks gateway health and auto-restarts if DOWN.
# Can run standalone or be called from macos-healthcheck.sh.

set -euo pipefail

GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-http://127.0.0.1:18789/}"
WEBHOOK_URL="${SENTINEL_WEBHOOK:-https://nail.n8n.evohaus.org/webhook/sentinel-alert}"
MACHINE_NAME="${SENTINEL_MACHINE:-$(hostname -s)}"
LOG_DIR="$HOME/sentinel-logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/gateway-watchdog.log"

TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Check if gateway is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$GATEWAY_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ] || [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
  echo "[$TIMESTAMP] GATEWAY DOWN (HTTP=$HTTP_CODE) — attempting restart" >> "$LOG"
  echo "[$TIMESTAMP] GATEWAY DOWN (HTTP=$HTTP_CODE) — attempting restart"

  # Try launchctl restart first (OpenClaw's own LaunchAgent)
  launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || \
    (cd "$HOME/.openclaw" && openclaw gateway start 2>/dev/null) || \
    echo "[$TIMESTAMP] RESTART FAILED — manual intervention needed" >> "$LOG"

  # Alert via webhook
  curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"sentinel_gateway_restart\",
      \"machine\": \"$MACHINE_NAME\",
      \"severity\": \"critical\",
      \"finding\": \"OpenClaw gateway was DOWN (HTTP=$HTTP_CODE), auto-restart triggered\",
      \"timestamp\": \"$TIMESTAMP\"
    }" 2>/dev/null || true

  echo "[$TIMESTAMP] GATEWAY RESTART triggered" >> "$LOG"

  # Verify restart after 5 seconds
  sleep 5
  VERIFY_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$GATEWAY_URL" 2>/dev/null || echo "000")
  if [ "$VERIFY_CODE" = "200" ] || [ "$VERIFY_CODE" = "426" ]; then
    echo "[$TIMESTAMP] GATEWAY RECOVERED (HTTP=$VERIFY_CODE)" >> "$LOG"
    echo "[$TIMESTAMP] GATEWAY RECOVERED (HTTP=$VERIFY_CODE)"
  else
    echo "[$TIMESTAMP] GATEWAY STILL DOWN after restart (HTTP=$VERIFY_CODE)" >> "$LOG"
    echo "[$TIMESTAMP] GATEWAY STILL DOWN after restart (HTTP=$VERIFY_CODE)"
  fi
else
  echo "[$TIMESTAMP] GATEWAY OK (HTTP=$HTTP_CODE)" >> "$LOG"
  echo "[$TIMESTAMP] GATEWAY OK (HTTP=$HTTP_CODE)"
fi
