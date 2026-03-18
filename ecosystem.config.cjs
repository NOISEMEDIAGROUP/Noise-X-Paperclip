module.exports = {
  apps: [{
    name: 'paperclip',
    cwd: '/home/alfred/paperclip',
    interpreter: 'node',
    script: 'server/node_modules/tsx/dist/cli.mjs',
    args: 'server/src/index.ts',
    env: {
      DATABASE_URL: 'postgres://alfred@localhost:5432/paperclip',
      SERVE_UI: 'true'
    }
  }]
};
