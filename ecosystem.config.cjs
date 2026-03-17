const fs = require("fs");

function readSecret(path) {
  try { return fs.readFileSync(path, "utf8").trim(); }
  catch { return ""; }
}

const serviceToken = readSecret("/home/claw-1/.paperclip/service-token");
const discordToken = readSecret("/home/claw-1/.paperclip/discord-token");

module.exports = {
  apps: [
    {
      name: "paperclip",
      cwd: "/home/claw-1/paperclip",
      interpreter: "none",
      script: "/bin/bash",
      args: `-c 'export PAPERCLIP_SERVICE_TOKEN=${serviceToken} && cd /home/claw-1/paperclip && PAPERCLIP_MIGRATION_PROMPT=never PAPERCLIP_UI_DEV_MIDDLEWARE=true pnpm --filter @paperclipai/server dev:watch'`,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      error_file: "/home/claw-1/paperclip/logs/pm2-error.log",
      out_file: "/home/claw-1/paperclip/logs/pm2-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "discord-bot",
      cwd: "/home/claw-1/paperclip/discord-bot",
      script: "index.mjs",
      env: {
        DISCORD_TOKEN: discordToken,
        PAPERCLIP_URL: "http://localhost:3100",
        PAPERCLIP_SERVICE_TOKEN: serviceToken,
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      error_file: "/home/claw-1/paperclip/logs/discord-bot-error.log",
      out_file: "/home/claw-1/paperclip/logs/discord-bot-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
