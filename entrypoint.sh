#!/bin/sh
set -e

# Start the server in the background
node --import ./server/node_modules/tsx/dist/loader.mjs server/dist/index.js &
SERVER_PID=$!

# Wait for server to be healthy
echo "[entrypoint] Waiting for server to start..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
    echo "[entrypoint] Server is healthy!"
    break
  fi
  echo "[entrypoint] Waiting... ($i/60)"
  sleep 2
done

# Check bootstrap status
BOOTSTRAP_STATUS=$(curl -sf http://localhost:3100/api/health | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).bootstrapStatus)}catch(e){console.log('unknown')}})" 2>/dev/null || echo "unknown")

if [ "$BOOTSTRAP_STATUS" = "bootstrap_pending" ]; then
  echo "[entrypoint] Bootstrap pending - generating CEO invite..."
  pnpm paperclipai auth bootstrap-ceo --base-url "${PAPERCLIP_PUBLIC_URL:-https://noise-x-paperclip.onrender.com}" || echo "[entrypoint] Bootstrap command failed (may already be bootstrapped)"
else
  echo "[entrypoint] Bootstrap status: $BOOTSTRAP_STATUS - skipping bootstrap-ceo"
fi

# Keep server running in foreground
wait $SERVER_PID
