import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from "discord.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PAPERCLIP_URL = process.env.PAPERCLIP_URL || "http://localhost:3100";
const SERVICE_TOKEN = process.env.PAPERCLIP_SERVICE_TOKEN;

if (!DISCORD_TOKEN) { console.error("DISCORD_TOKEN required"); process.exit(1); }
if (!SERVICE_TOKEN) { console.error("PAPERCLIP_SERVICE_TOKEN required"); process.exit(1); }

// --- Paperclip API helpers ---

async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${SERVICE_TOKEN}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${PAPERCLIP_URL}/api${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Paperclip ${res.status}: ${text.slice(0, 200)}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("json")) return res.json();
  return null;
}

// Cache company + CEO agent info
let ceoAgent = null;
let defaultCompanyId = null;

async function findCEO() {
  if (ceoAgent) return ceoAgent;
  const companies = await api("GET", "/companies");
  if (!companies?.length) throw new Error("No companies found");
  defaultCompanyId = companies[0].id;

  const agents = await api("GET", `/companies/${defaultCompanyId}/agents`);
  const ceo = agents.find(a => a.name.toLowerCase().includes("ceo") && a.status !== "terminated");
  if (!ceo) throw new Error("No active CEO agent found");
  ceoAgent = ceo;
  console.log(`[bot] Found CEO: ${ceo.name} (${ceo.id}) in company ${defaultCompanyId}`);
  return ceo;
}

async function wakeAgent(agentId, message, discordContext) {
  return api("POST", `/agents/${agentId}/wakeup`, {
    source: "on_demand",
    triggerDetail: "callback",
    reason: "discord_message",
    payload: {
      message,
      responseChannel: "discord",
      discordChannelId: discordContext.channelId,
      discordUserId: discordContext.userId,
    },
  });
}

async function getRunResult(runId, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const run = await api("GET", `/heartbeat-runs/${runId}`);
      if (run.status === "completed" || run.status === "failed" || run.status === "error") {
        return run;
      }
    } catch { /* run not found yet, keep polling */ }
    await new Promise(r => setTimeout(r, 3000));
  }
  return null;
}

async function getLatestComment(issueId) {
  try {
    const comments = await api("GET", `/issues/${issueId}/comments`);
    if (comments?.length) {
      return comments[comments.length - 1];
    }
  } catch { /* no comments */ }
  return null;
}

async function getAgentStatus(agentId) {
  const agent = await api("GET", `/agents/${agentId}`);
  const state = await api("GET", `/agents/${agentId}/runtime-state`).catch(() => null);
  return { agent, state };
}

// --- Slash commands ---

const commands = [
  new SlashCommandBuilder()
    .setName("ceo")
    .setDescription("Send a message to the CEO agent")
    .addStringOption(opt => opt.setName("message").setDescription("What to tell the CEO").setRequired(true)),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Get the CEO agent's current status"),
  new SlashCommandBuilder()
    .setName("agents")
    .setDescription("List all agents and their status"),
].map(cmd => cmd.toJSON());

// --- Discord client ---

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.once("ready", async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);

  // Register slash commands
  const rest = new REST().setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("[bot] Slash commands registered");
  } catch (err) {
    console.error("[bot] Failed to register commands:", err.message);
  }

  // Prefetch CEO
  try { await findCEO(); } catch (err) { console.warn("[bot] CEO not found yet:", err.message); }
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ceo") {
    const message = interaction.options.getString("message");
    await interaction.deferReply();

    try {
      const ceo = await findCEO();
      const result = await wakeAgent(ceo.id, message, {
        channelId: interaction.channelId,
        userId: interaction.user.id,
      });

      if (result?.status === "skipped") {
        await interaction.editReply("CEO is currently paused or unavailable.");
        return;
      }

      const runId = result?.id || result?.runId;
      if (!runId) {
        await interaction.editReply(`Message sent to ${ceo.name}. Waiting for response...`);
        return;
      }

      await interaction.editReply(`📨 Message sent to **${ceo.name}**. Run \`${runId.slice(0, 8)}\` started. Waiting for response...`);

      // Poll for completion in background
      const run = await getRunResult(runId);
      if (run) {
        const summary = run.resultSummary || run.summary || "Run completed (no summary).";
        const status = run.status === "completed" ? "✅" : "❌";
        const reply = `${status} **${ceo.name}** responded:\n\n${summary.slice(0, 1900)}`;
        await interaction.followUp(reply);
      } else {
        await interaction.followUp(`⏱️ CEO is still working on this (run ${runId.slice(0, 8)}). Check Paperclip for the full response.`);
      }
    } catch (err) {
      await interaction.editReply(`❌ Error: ${err.message}`);
    }
  }

  if (interaction.commandName === "status") {
    await interaction.deferReply();
    try {
      const ceo = await findCEO();
      const { agent, state } = await getAgentStatus(ceo.id);
      const embed = new EmbedBuilder()
        .setTitle(`${agent.name}`)
        .setColor(agent.status === "active" ? 0x22c55e : 0xef4444)
        .addFields(
          { name: "Status", value: agent.status, inline: true },
          { name: "Adapter", value: agent.adapterType || "unknown", inline: true },
          { name: "Last Run", value: state?.lastRunStatus || "none", inline: true },
        );
      if (state?.totalTokens) {
        embed.addFields({ name: "Total Tokens", value: state.totalTokens.toLocaleString(), inline: true });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply(`❌ Error: ${err.message}`);
    }
  }

  if (interaction.commandName === "agents") {
    await interaction.deferReply();
    try {
      if (!defaultCompanyId) await findCEO();
      const agents = await api("GET", `/companies/${defaultCompanyId}/agents`);
      const lines = agents.map(a => {
        const icon = a.status === "active" ? "🟢" : a.status === "paused" ? "🟡" : "🔴";
        return `${icon} **${a.name}** — ${a.status} (${a.adapterType || "?"})`;
      });
      await interaction.editReply(lines.join("\n") || "No agents found.");
    } catch (err) {
      await interaction.editReply(`❌ Error: ${err.message}`);
    }
  }
});

// Handle @mentions in messages (e.g. "@MoqcAI CEO check the leads")
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  // Strip the bot mention from the message
  const content = message.content.replace(/<@!?\d+>/g, "").trim();
  if (!content) {
    await message.reply("What would you like me to tell the CEO?");
    return;
  }

  try {
    const ceo = await findCEO();
    await message.react("📨");

    const result = await wakeAgent(ceo.id, content, {
      channelId: message.channelId,
      userId: message.author.id,
    });

    const runId = result?.id || result?.runId;
    if (!runId) {
      await message.reply(`Sent to **${ceo.name}** but couldn't track the run.`);
      return;
    }

    // Poll for completion
    const run = await getRunResult(runId, 180000); // 3 min timeout for @mentions
    if (run) {
      const summary = run.resultSummary || run.summary || "Done (no summary).";
      const status = run.status === "completed" ? "✅" : "❌";
      await message.reply(`${status} **${ceo.name}**: ${summary.slice(0, 1900)}`);
    } else {
      await message.reply(`⏱️ CEO is still working. Check Paperclip for the full response.`);
    }
  } catch (err) {
    await message.reply(`❌ Error: ${err.message}`);
  }
});

client.login(DISCORD_TOKEN);
