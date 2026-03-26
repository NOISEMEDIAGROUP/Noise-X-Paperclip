/**
 * ONE-TIME PATCH: Backfill authToken for all openclaw_gateway agents
 *
 * Problem: Seed script created agents with adapterConfig.authToken="" because
 * OPENCLAW_GATEWAY_TOKEN env var was not set at seed time.
 * Result: All openclaw_gateway agents fail with "gateway token missing".
 *
 * This patch reads the token from ~/.openclaw/openclaw.json and writes it
 * to every agent with adapter_type = 'openclaw_gateway'.
 *
 * Run: npx tsx packages/db/src/patch-openclaw-gateway-token.ts
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import postgres from "postgres";

const url = process.env.DATABASE_URL!;
if (!url) throw new Error("DATABASE_URL is required");

const COMPANY_ID = "e4f86ad5-bcdd-4ac9-9972-11ed5f6c7820";
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "ws://127.0.0.1:18789";

function readOpenClawToken(): string {
  // Priority: env var > ~/.openclaw/openclaw.json
  if (process.env.OPENCLAW_GATEWAY_TOKEN) {
    return process.env.OPENCLAW_GATEWAY_TOKEN;
  }
  const configPath = join(homedir(), ".openclaw", "openclaw.json");
  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    const token = config?.gateway?.auth?.token;
    if (typeof token === "string" && token.length > 0) return token;
  } catch {
    // ignore
  }
  throw new Error(
    `No OpenClaw gateway token found. Set OPENCLAW_GATEWAY_TOKEN env var or ensure ~/.openclaw/openclaw.json has .gateway.auth.token`
  );
}

async function main() {
  const token = readOpenClawToken();
  console.log(`OpenClaw token found (${token.slice(0, 8)}...)\n`);

  const sql = postgres(url);
  console.log("EVOHAUS AI — OpenClaw Gateway Token Patch\n");

  // 1. Show current state
  const before = await sql`
    SELECT id, name, adapter_config
    FROM agents
    WHERE company_id = ${COMPANY_ID}
      AND adapter_type = 'openclaw_gateway'
    ORDER BY name
  `;
  console.log(`Found ${before.length} openclaw_gateway agents:`);
  for (const a of before) {
    const cfg = a.adapter_config as Record<string, unknown>;
    const hasToken = typeof cfg?.authToken === "string" && (cfg.authToken as string).length > 0;
    console.log(`  ${hasToken ? "✓" : "✗"} ${a.name} (authToken: ${hasToken ? "set" : "MISSING"})`);
  }
  console.log();

  // 2. Patch: set authToken + url + expectedCompanyId in adapterConfig, preserving existing fields
  const patched = await sql`
    UPDATE agents
    SET
      adapter_config = adapter_config || jsonb_build_object(
        'authToken', ${token}::text,
        'url', COALESCE(adapter_config->>'url', ${OPENCLAW_GATEWAY_URL}::text),
        'expectedCompanyId', ${COMPANY_ID}::text
      ),
      updated_at = NOW()
    WHERE company_id = ${COMPANY_ID}
      AND adapter_type = 'openclaw_gateway'
  `;
  console.log(`[1] Patched ${patched.count} openclaw_gateway agents with authToken + expectedCompanyId`);

  // 3. Verify
  const after = await sql`
    SELECT name, adapter_config->>'authToken' as token_prefix
    FROM agents
    WHERE company_id = ${COMPANY_ID}
      AND adapter_type = 'openclaw_gateway'
    ORDER BY name
  `;
  console.log("\nVerification:");
  for (const a of after) {
    const t = a.token_prefix as string;
    console.log(`  ✓ ${a.name}: ${t ? t.slice(0, 8) + "..." : "STILL MISSING"}`);
  }

  await sql.end();
  console.log("\nDone! All openclaw_gateway agents should now connect successfully.");
}

main().catch((err) => {
  console.error("PATCH FAILED:", err);
  process.exit(1);
});
