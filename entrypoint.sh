#!/bin/sh
set -e

APP_PORT="${PORT:-3100}"

# Ensure config file exists for the CLI (server creates its own, but CLI needs one too)
CONFIG_DIR="/paperclip/instances/default"
CONFIG_FILE="$CONFIG_DIR/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "[entrypoint] Creating config.json for CLI..."
  mkdir -p "$CONFIG_DIR"
  cat > "$CONFIG_FILE" << 'CFGEOF'
{
  "$meta": {
    "version": 1,
    "updatedAt": "2026-03-30T00:00:00.000Z",
    "source": "onboard"
  },
  "database": {
    "mode": "embedded-postgres",
    "embeddedPostgresDataDir": "/paperclip/instances/default/db",
    "embeddedPostgresPort": 54329,
    "backup": {
      "enabled": true,
      "intervalMinutes": 60,
      "retentionDays": 30,
      "dir": "/paperclip/instances/default/data/backups"
    }
  },
  "logging": {
    "mode": "file",
    "logDir": "/paperclip/instances/default/logs"
  },
  "server": {
    "deploymentMode": "authenticated",
    "exposure": "private",
    "host": "0.0.0.0",
    "port": 10000,
    "allowedHostnames": ["noise-x-paperclip.onrender.com"],
    "serveUi": true
  },
  "auth": {
    "baseUrlMode": "auto",
    "disableSignUp": false
  }
}
CFGEOF
fi

# Fix PostgreSQL data directory permissions (required after Render disk mount)
DB_DIR="/paperclip/instances/default/db"
if [ -d "$DB_DIR" ]; then
  chmod 700 "$DB_DIR"
  echo "[entrypoint] Fixed db directory permissions"
fi

# Disable exit-on-error for server startup (embedded Postgres may need retries)
set +e

# Start server with retry logic
MAX_RETRIES=3
RETRY=0
HEALTHY=false

while [ $RETRY -lt $MAX_RETRIES ]; do
  RETRY=$((RETRY + 1))
  echo "[entrypoint] Starting server (attempt $RETRY/$MAX_RETRIES)..."
  node --import ./server/node_modules/tsx/dist/loader.mjs server/dist/index.js &
  SERVER_PID=$!

  # Wait for server to be healthy
  echo "[entrypoint] Waiting for server on port $APP_PORT..."
  for i in $(seq 1 60); do
    if ! kill -0 $SERVER_PID 2>/dev/null; then
      echo "[entrypoint] Server process exited unexpectedly"
      break
    fi
    if curl -sf http://localhost:$APP_PORT/api/health > /dev/null 2>&1; then
      echo "[entrypoint] Server is healthy!"
      HEALTHY=true
      break
    fi
    sleep 2
  done

  if [ "$HEALTHY" = "true" ]; then
    break
  fi

  # Kill server if still running but not healthy
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true

  if [ $RETRY -lt $MAX_RETRIES ]; then
    echo "[entrypoint] Retrying in 5 seconds..."
    sleep 5
  fi
done

if [ "$HEALTHY" != "true" ]; then
  echo "[entrypoint] ERROR: Server failed to start after $MAX_RETRIES attempts"
  exit 1
fi

# Re-enable exit-on-error
set -e

# Check bootstrap status
BOOTSTRAP_STATUS=$(curl -sf http://localhost:$APP_PORT/api/health | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).bootstrapStatus)}catch(e){console.log('unknown')}})" 2>/dev/null || echo "unknown")

echo "[entrypoint] Bootstrap status: $BOOTSTRAP_STATUS"

if [ "$BOOTSTRAP_STATUS" = "bootstrap_pending" ]; then
  echo "[entrypoint] Bootstrap pending - generating CEO invite..."
  pnpm paperclipai auth bootstrap-ceo --base-url "${PAPERCLIP_PUBLIC_URL:-https://noise-x-paperclip.onrender.com}" || echo "[entrypoint] Bootstrap command failed"
else
  echo "[entrypoint] Skipping bootstrap-ceo (status: $BOOTSTRAP_STATUS)"
fi

# Keep server running in foreground
wait $SERVER_PID
