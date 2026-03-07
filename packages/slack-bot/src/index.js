import { loadConfig } from "./config.js";
import { CodexClient } from "./codex.js";
import { SlackRuntime } from "./slack-runtime.js";

async function main() {
  const { config, configPath } = loadConfig(process.cwd());

  const codex = new CodexClient(config.codex);
  const runtime = new SlackRuntime({
    config,
    configPath,
    codex,
  });

  await runtime.start();
}

main().catch((err) => {
  const reason = err instanceof Error ? err.message : String(err);
  console.error(`startup failed: ${reason}`);
  process.exit(1);
});
