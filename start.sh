#!/bin/bash
# Strip Claude Code session vars so Paperclip can spawn claude subprocesses
exec env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT \
  PATH="/home/avi/.npm-global/bin:$PATH" \
  node --import ./server/node_modules/tsx/dist/esm/index.mjs server/src/index.ts
