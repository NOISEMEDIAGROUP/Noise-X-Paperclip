module.exports = {
  apps: [
    {
      name: "paperclip",
      cwd: "/home/claw-1/paperclip",
      script: "node",
      args: "scripts/dev-runner.mjs watch",
      interpreter: "none",
      script: "/bin/bash",
      args: "-c 'cd /home/claw-1/paperclip && PAPERCLIP_MIGRATION_PROMPT=never PAPERCLIP_UI_DEV_MIDDLEWARE=true pnpm run dev:watch'",
      env: {
        NODE_ENV: "development",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      error_file: "/home/claw-1/paperclip/logs/pm2-error.log",
      out_file: "/home/claw-1/paperclip/logs/pm2-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
