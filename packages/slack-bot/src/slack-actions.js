import fs from "node:fs";
import path from "node:path";

function tokenize(input) {
  const out = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        out.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) {
    out.push(current);
  }
  return out;
}

function toSlackTs(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "";
  }
  if (/^\d+\.\d+$/.test(value)) {
    return value;
  }
  const linkMatch = /\/archives\/([A-Z0-9]+)\/p(\d{10})(\d{6})/i.exec(value);
  if (linkMatch) {
    return `${linkMatch[2]}.${linkMatch[3]}`;
  }
  const numeric = /^p?(\d{10})(\d{6})$/.exec(value);
  if (numeric) {
    return `${numeric[1]}.${numeric[2]}`;
  }
  return value;
}

function parseActionArgs(text) {
  const tokens = tokenize(text.trim());
  const command = (tokens.shift() || "").toLowerCase();
  return { command, tokens };
}

function formatMessageSummary(message) {
  const user = message.user || message.bot_id || "unknown";
  const text = (message.text || "").replace(/\s+/g, " ").trim();
  const files = Array.isArray(message.files) ? message.files : [];
  const fileSuffix =
    files.length > 0
      ? ` files=[${files
          .map((f) => `${f.name || f.id || "file"}${f.mimetype ? `:${f.mimetype}` : ""}`)
          .join(", ")}]`
      : "";
  return `- ts=${message.ts || "unknown"} user=${user}${text ? ` text=${text}` : ""}${fileSuffix}`;
}

async function readMessages(client, params) {
  const limit = Number.isFinite(params.limit) ? Math.max(1, Math.min(params.limit, 50)) : 20;
  if (params.threadTs) {
    const resp = await client.conversations.replies({
      channel: params.channelId,
      ts: params.threadTs,
      limit,
    });
    const replies = (resp.messages || []).filter((m) => m.ts !== params.threadTs);
    return {
      lines: replies.map((msg) => formatMessageSummary(msg)),
      hasMore: Boolean(resp.has_more),
      count: replies.length,
    };
  }

  const resp = await client.conversations.history({
    channel: params.channelId,
    limit,
  });
  const messages = resp.messages || [];
  return {
    lines: messages.map((msg) => formatMessageSummary(msg)),
    hasMore: Boolean(resp.has_more),
    count: messages.length,
  };
}

function ensureActionsEnabled(config, group) {
  if (!config.slack.actions[group]) {
    throw new Error(`Slack action group \"${group}\" is disabled by config.`);
  }
}

async function downloadFile({ client, token, fileId, dataDir }) {
  const info = await client.files.info({ file: fileId });
  const file = info.file;
  if (!file) {
    throw new Error("Slack file not found.");
  }
  const url = file.url_private_download || file.url_private;
  if (!url) {
    throw new Error("Slack file has no downloadable private URL.");
  }

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) {
    throw new Error(`Slack file download failed: HTTP ${resp.status}`);
  }

  const bytes = new Uint8Array(await resp.arrayBuffer());
  const downloadDir = path.join(dataDir, "downloads");
  fs.mkdirSync(downloadDir, { recursive: true });

  const baseName = (file.name || file.id || "slack-file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(downloadDir, `${Date.now()}-${baseName}`);
  fs.writeFileSync(filePath, bytes);

  return {
    filePath,
    size: bytes.byteLength,
    name: file.name || file.id || "file",
    mime: file.mimetype || "unknown",
  };
}

export async function handleSlackNativeAction(params) {
  const { text, client, channelId, threadTs, userId, config, botToken, dataDir } = params;
  const { command, tokens } = parseActionArgs(text);

  if (!command || command === "help") {
    return {
      handled: true,
      text:
        "Native commands: read [--thread <ts>] [--limit <n>] [channelId] | reactions add/remove/list <emoji?> <ts?> [channelId] | pins add/remove/list <ts?> [channelId] | member <userId> | emoji [query] | download-file <fileId>",
    };
  }

  if (command === "read") {
    ensureActionsEnabled(config, "messages");
    let readChannelId = channelId;
    let readThreadTs = threadTs;
    let limit = 20;

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token === "--thread") {
        readThreadTs = toSlackTs(tokens[i + 1] || "");
        i += 1;
        continue;
      }
      if (token === "--limit") {
        limit = Number.parseInt(tokens[i + 1] || "20", 10);
        i += 1;
        continue;
      }
      if (/^[CDG][A-Z0-9]+$/i.test(token)) {
        readChannelId = token;
      } else if (toSlackTs(token).includes(".")) {
        readThreadTs = toSlackTs(token);
      }
    }

    const result = await readMessages(client, {
      channelId: readChannelId,
      threadTs: readThreadTs,
      limit,
    });

    const title = readThreadTs
      ? `Read ${result.count} thread replies from ${readChannelId} (thread=${readThreadTs})`
      : `Read ${result.count} messages from ${readChannelId}`;

    return {
      handled: true,
      text: `${title}${result.hasMore ? " (has more)" : ""}\n${result.lines.join("\n") || "(no messages)"}`,
    };
  }

  if (command === "reactions") {
    ensureActionsEnabled(config, "reactions");
    const action = (tokens.shift() || "list").toLowerCase();
    const first = tokens.shift() || "";
    const second = tokens.shift() || "";

    if (action === "list") {
      const ts = toSlackTs(first || threadTs || "");
      const targetChannel = /^[CDG][A-Z0-9]+$/i.test(second) ? second : channelId;
      if (!ts) {
        return { handled: true, text: "Usage: reactions list <ts> [channelId]" };
      }
      const resp = await client.reactions.get({ channel: targetChannel, timestamp: ts, full: true });
      const reactions = resp.message?.reactions || [];
      const lines = reactions.map((r) => `- :${r.name}: count=${r.count || 0}`);
      return {
        handled: true,
        text: lines.length ? `Reactions on ${targetChannel} ${ts}:\n${lines.join("\n")}` : "No reactions found.",
      };
    }

    const emoji = first.replace(/^:+|:+$/g, "");
    const ts = toSlackTs(second || threadTs || "");
    const targetChannel = /^[CDG][A-Z0-9]+$/i.test(tokens[0] || "") ? tokens[0] : channelId;

    if (!emoji || !ts) {
      return {
        handled: true,
        text: "Usage: reactions add <emoji> <ts> [channelId] OR reactions remove <emoji> <ts> [channelId]",
      };
    }

    if (action === "add") {
      await client.reactions.add({ channel: targetChannel, timestamp: ts, name: emoji });
      return { handled: true, text: `Added :${emoji}: to ${targetChannel} ${ts}` };
    }
    if (action === "remove") {
      await client.reactions.remove({ channel: targetChannel, timestamp: ts, name: emoji });
      return { handled: true, text: `Removed :${emoji}: from ${targetChannel} ${ts}` };
    }

    return { handled: true, text: "Usage: reactions [add|remove|list] ..." };
  }

  if (command === "pins") {
    ensureActionsEnabled(config, "pins");
    const action = (tokens.shift() || "list").toLowerCase();

    if (action === "list") {
      const targetChannel = /^[CDG][A-Z0-9]+$/i.test(tokens[0] || "") ? tokens[0] : channelId;
      const resp = await client.pins.list({ channel: targetChannel });
      const items = resp.items || [];
      const lines = items.map((item) => {
        if (item.type === "message") {
          return `- message ts=${item.message?.ts || "unknown"}`;
        }
        if (item.type === "file") {
          return `- file id=${item.file?.id || "unknown"} name=${item.file?.name || "unknown"}`;
        }
        return `- ${item.type || "item"}`;
      });
      return {
        handled: true,
        text: lines.length ? `Pins in ${targetChannel}:\n${lines.join("\n")}` : "No pins found.",
      };
    }

    const ts = toSlackTs(tokens[0] || threadTs || "");
    const targetChannel = /^[CDG][A-Z0-9]+$/i.test(tokens[1] || "") ? tokens[1] : channelId;
    if (!ts) {
      return { handled: true, text: "Usage: pins add <ts> [channelId] OR pins remove <ts> [channelId]" };
    }

    if (action === "add") {
      await client.pins.add({ channel: targetChannel, timestamp: ts });
      return { handled: true, text: `Pinned ${targetChannel} ${ts}` };
    }
    if (action === "remove") {
      await client.pins.remove({ channel: targetChannel, timestamp: ts });
      return { handled: true, text: `Unpinned ${targetChannel} ${ts}` };
    }

    return { handled: true, text: "Usage: pins [add|remove|list] ..." };
  }

  if (command === "member") {
    ensureActionsEnabled(config, "memberInfo");
    const lookupUser = tokens[0] || userId;
    if (!lookupUser) {
      return { handled: true, text: "Usage: member <userId>" };
    }
    const info = await client.users.info({ user: lookupUser });
    const user = info.user;
    return {
      handled: true,
      text:
        `Member ${lookupUser}:\n` +
        `- real_name=${user?.real_name || ""}\n` +
        `- display_name=${user?.profile?.display_name || ""}\n` +
        `- tz=${user?.tz || ""}\n` +
        `- is_bot=${Boolean(user?.is_bot)}\n` +
        `- is_admin=${Boolean(user?.is_admin)}`,
    };
  }

  if (command === "emoji") {
    ensureActionsEnabled(config, "emojiList");
    const query = (tokens.join(" ") || "").trim().toLowerCase();
    const resp = await client.emoji.list();
    const all = Object.keys(resp.emoji || {});
    const filtered = query ? all.filter((name) => name.toLowerCase().includes(query)) : all;
    const preview = filtered.slice(0, 100).map((name) => `:${name}:`).join(" ");
    return {
      handled: true,
      text: `Emoji count=${filtered.length}${preview ? `\n${preview}` : ""}${filtered.length > 100 ? "\n...truncated" : ""}`,
    };
  }

  if (command === "download-file") {
    ensureActionsEnabled(config, "messages");
    const fileId = tokens[0];
    if (!fileId) {
      return { handled: true, text: "Usage: download-file <fileId>" };
    }
    const result = await downloadFile({
      client,
      token: botToken,
      fileId,
      dataDir,
    });
    return {
      handled: true,
      text: `Downloaded ${result.name} (${result.mime}, ${result.size} bytes) to ${result.filePath}`,
    };
  }

  return { handled: false };
}
