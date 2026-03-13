import { listenPicoclawBridge } from "./server.js";
import { resolveBridgeConfig } from "./config.js";

const config = resolveBridgeConfig();
const server = await listenPicoclawBridge(config);

console.log(
  JSON.stringify({
    status: "listening",
    host: config.host,
    port: config.port,
    command: config.command,
    configPath: config.configPath,
  }),
);

process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
