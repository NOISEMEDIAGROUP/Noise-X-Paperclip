import path from "node:path";
import { loadConfig } from "./config.js";
import { PairingStore } from "./pairing-store.js";

function printUsage() {
  console.log("Usage:");
  console.log("  npm run pairing:list");
  console.log("  npm run pairing:approve -- <code>");
}

async function main() {
  const { config } = loadConfig(process.cwd());
  const store = new PairingStore(path.resolve(config.runtime.dataDir));
  store.ensureLoaded();

  const [command, arg] = process.argv.slice(2);

  if (!command || command === "help") {
    printUsage();
    process.exit(0);
  }

  if (command === "list") {
    const pending = store.listPending();
    const approved = store.listApproved();

    console.log("Pending requests:");
    if (pending.length === 0) {
      console.log("  (none)");
    } else {
      for (const entry of pending) {
        console.log(
          `  - user=${entry.userId} code=${entry.code} createdAt=${entry.createdAt} name=${entry.meta?.name || ""}`,
        );
      }
    }

    console.log("Approved users:");
    if (approved.length === 0) {
      console.log("  (none)");
    } else {
      for (const entry of approved) {
        console.log(
          `  - user=${entry.userId} approvedAt=${entry.approvedAt} name=${entry.meta?.name || ""}`,
        );
      }
    }
    process.exit(0);
  }

  if (command === "approve") {
    const code = String(arg || "").trim();
    if (!code) {
      console.error("Missing pairing code.");
      printUsage();
      process.exit(1);
    }

    const result = store.approveByCode(code);
    if (!result) {
      console.error(`No pending pairing request found for code ${code}.`);
      process.exit(1);
    }

    console.log(`Approved user ${result.userId} at ${result.approvedAt}`);
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

main().catch((err) => {
  const reason = err instanceof Error ? err.message : String(err);
  console.error(`pairing cli failed: ${reason}`);
  process.exit(1);
});
