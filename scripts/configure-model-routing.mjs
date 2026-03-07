import process from "node:process";

const PROVIDERS = {
  openai: {
    label: "OpenAI",
    secretNames: ["provider-openai-api-key", "openai-api-key"],
    envVars: ["OPENAI_API_KEY"],
    defaultBaseUrl: "https://api.openai.com/v1",
    supportsModelRouting: true,
  },
  anthropic: {
    label: "Anthropic",
    secretNames: ["provider-anthropic-api-key", "anthropic-api-key"],
    envVars: ["ANTHROPIC_API_KEY"],
    defaultBaseUrl: null,
    supportsModelRouting: false,
  },
  alibaba: {
    label: "Alibaba DashScope",
    secretNames: ["provider-alibaba-api-key", "alibaba-api-key"],
    envVars: ["ALIBABA_API_KEY", "DASHSCOPE_API_KEY"],
    defaultBaseUrl: "https://coding-intl.dashscope.aliyuncs.com/v1",
    supportsModelRouting: true,
  },
  groq: {
    label: "Groq",
    secretNames: ["provider-groq-api-key", "groq-api-key"],
    envVars: ["GROQ_API_KEY"],
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    supportsModelRouting: true,
  },
  xai: {
    label: "xAI",
    secretNames: ["provider-xai-api-key", "xai-api-key"],
    envVars: ["XAI_API_KEY"],
    defaultBaseUrl: "https://api.x.ai/v1",
    supportsModelRouting: true,
  },
  minimax: {
    label: "MiniMax",
    secretNames: ["provider-minimax-api-key", "minimax-api-key"],
    envVars: ["MINIMAX_API_KEY"],
    defaultBaseUrl: "https://api.minimax.chat/v1",
    supportsModelRouting: true,
  },
};

function usage() {
  console.log(`Usage:
  node scripts/configure-model-routing.mjs --company-id <id> [options]

Options:
  --api-base <url>           API base URL (default: http://localhost:3100)
  --provider <id>            openai|anthropic|alibaba|groq|xai|minimax (default: alibaba)
  --model <id>               model name to set on target agents
  --base-url <url>           override MODEL_BASE_URL
  --agent <name-or-id>       limit updates to matching agent name/id (repeatable)
  --adapter-type <type>      filter by adapter type (default: process). codex_local supports provider=openai only.
  --skip-key-sync            do not set provider API key env vars
  --dry-run                  print plan without writing
  --help                     show this help

Examples:
  node scripts/configure-model-routing.mjs --company-id <id> --provider alibaba --model qwen3-coder-plus
  node scripts/configure-model-routing.mjs --company-id <id> --provider groq --model llama-3.3-70b-versatile --dry-run
`);
}

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();
  const multi = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    if (token === "--") continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags.add(key);
      continue;
    }
    i += 1;
    if (key === "agent") {
      const arr = multi.get(key) ?? [];
      arr.push(next);
      multi.set(key, arr);
    } else {
      values.set(key, next);
    }
  }
  return { flags, values, multi };
}

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!response.ok) {
    const message =
      (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.error) ||
      `${response.status} ${response.statusText}`;
    throw new Error(`Request failed (${response.status}) ${String(message)} for ${url}`);
  }
  return parsed;
}

function normalizeApiBase(raw) {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function matchesTarget(agent, targets) {
  if (targets.length === 0) return true;
  const name = (agent.name ?? "").toLowerCase();
  const id = (agent.id ?? "").toLowerCase();
  return targets.some((target) => {
    const needle = target.toLowerCase();
    return name.includes(needle) || id === needle;
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.has("help")) {
    usage();
    process.exit(0);
  }

  const companyId = args.values.get("company-id");
  if (!companyId) {
    usage();
    throw new Error("Missing --company-id");
  }

  const providerId = (args.values.get("provider") ?? "alibaba").toLowerCase();
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown provider '${providerId}'.`);
  }

  const applyKeys = !args.flags.has("skip-key-sync");
  const model = args.values.get("model") ?? null;
  if (model && !provider.supportsModelRouting) {
    throw new Error(`${provider.label} profile does not support MODEL_BASE_URL/MODEL_NAME routing.`);
  }

  const baseUrl = args.values.get("base-url") ?? provider.defaultBaseUrl;
  if (model && !baseUrl) {
    throw new Error("No base URL available. Pass --base-url explicitly.");
  }

  if (!applyKeys && !model) {
    throw new Error("Nothing to apply. Provide --model and/or remove --skip-key-sync.");
  }

  const apiBase = normalizeApiBase(args.values.get("api-base") ?? "http://localhost:3100");
  const adapterType = (args.values.get("adapter-type") ?? "process").toLowerCase();
  if (adapterType === "codex_local" && providerId !== "openai") {
    throw new Error(
      "codex_local bulk routing currently supports provider=openai only. For Alibaba Coding Plan, use process adapters/workers.",
    );
  }
  const dryRun = args.flags.has("dry-run");
  const agentTargets = args.multi.get("agent") ?? [];

  const agents = await requestJson(`${apiBase}/api/companies/${encodeURIComponent(companyId)}/agents`);
  if (!Array.isArray(agents)) throw new Error("Unexpected /agents response");

  const filteredAgents = agents.filter((agent) => {
    const rec = asRecord(agent);
    if (!rec) return false;
    if (rec.status === "terminated") return false;
    if ((String(rec.adapterType ?? "")).toLowerCase() !== adapterType) return false;
    return matchesTarget(rec, agentTargets);
  });

  if (filteredAgents.length === 0) {
    console.log("No matching agents found. Nothing to update.");
    return;
  }

  let providerSecret = null;
  if (applyKeys) {
    const secrets = await requestJson(`${apiBase}/api/companies/${encodeURIComponent(companyId)}/secrets`);
    if (!Array.isArray(secrets)) throw new Error("Unexpected /secrets response");
    providerSecret = secrets.find((secret) =>
      provider.secretNames.includes(String((asRecord(secret)?.name ?? "").toLowerCase())),
    );
    if (!providerSecret) {
      throw new Error(
        `No provider secret found for ${provider.label}. Expected one of: ${provider.secretNames.join(", ")}`,
      );
    }
  }

  const patchPlan = filteredAgents.map((agent) => {
    const config = asRecord(agent.adapterConfig) ?? {};
    const env = { ...(asRecord(config.env) ?? {}) };
    const nextConfig = { ...config };
    if (applyKeys) {
      for (const envVar of provider.envVars) {
        env[envVar] = {
          type: "secret_ref",
          secretId: providerSecret.id,
          version: "latest",
        };
      }
    }
    if (model) {
      if (String(agent.adapterType).toLowerCase() === "process") {
        env.MODEL_PROVIDER = { type: "plain", value: providerId };
        env.MODEL_BASE_URL = { type: "plain", value: baseUrl };
        env.MODEL_NAME = { type: "plain", value: model };
      }
      if (String(agent.adapterType).toLowerCase() === "codex_local") {
        const providerKeyEnv = provider.envVars[0] ?? "OPENAI_API_KEY";
        nextConfig.model = model;
        nextConfig.modelProvider = providerId;
        nextConfig.modelBaseUrl = baseUrl;
        nextConfig.modelApiKeyEnv = providerKeyEnv;
        env.OPENAI_BASE_URL = { type: "plain", value: baseUrl };
        if (applyKeys) {
          env.OPENAI_API_KEY = {
            type: "secret_ref",
            secretId: providerSecret.id,
            version: "latest",
          };
        }
      }
    }
    return {
      agent,
      body: {
        adapterConfig: {
          ...nextConfig,
          env,
        },
      },
    };
  });

  console.log(`Company: ${companyId}`);
  console.log(`Provider: ${provider.label} (${providerId})`);
  console.log(`Adapter filter: ${adapterType}`);
  console.log(`Matched agents: ${patchPlan.length}`);
  if (applyKeys) console.log(`Key sync env vars: ${provider.envVars.join(", ")}`);
  if (model) console.log(`Model routing: ${model} @ ${baseUrl}`);

  for (const step of patchPlan) {
    console.log(`- ${step.agent.name} (${step.agent.id})`);
  }

  if (dryRun) {
    console.log("Dry run only. No updates were written.");
    return;
  }

  for (const step of patchPlan) {
    const url = `${apiBase}/api/agents/${encodeURIComponent(step.agent.id)}?companyId=${encodeURIComponent(companyId)}`;
    await requestJson(url, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(step.body),
    });
  }

  console.log(`Updated ${patchPlan.length} agents successfully.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`configure-model-routing failed: ${message}`);
  process.exit(1);
});
