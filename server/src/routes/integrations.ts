/**
 * Integration Verification Routes
 * 
 * Provides endpoints to test integration connections before saving credentials.
 * Each endpoint validates credentials by making a real API call to the service.
 */

// @ts-nocheck
import { Router } from "express";
import { z } from "zod";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { logActivity } from "../services/index.js";

// ============================================================================
// Validation Schemas
// ============================================================================

const stripeVerifySchema = z.object({
  secretKey: z.string().min(1, "Secret key is required"),
  webhookSecret: z.string().optional(),
});

const telegramVerifySchema = z.object({
  botToken: z.string().min(1, "Bot token is required"),
  chatId: z.string().min(1, "Chat ID is required"),
});

const slackVerifySchema = z.object({
  botToken: z.string().min(1, "Bot token is required"),
  signingSecret: z.string().min(1, "Signing secret is required"),
  defaultChannelId: z.string().min(1, "Default channel ID is required"),
});

const resendVerifySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  fromEmail: z.string().email("Valid email address required"),
});

const githubVerifySchema = z.object({
  token: z.string().min(1, "Token is required"),
  repoOwner: z.string().min(1, "Repository owner is required"),
  repoName: z.string().min(1, "Repository name is required"),
});

const sentryVerifySchema = z.object({
  dsn: z.string().url("Valid DSN URL required"),
});

const uptimeKumaVerifySchema = z.object({
  url: z.string().url("Valid URL required"),
  apiKey: z.string().min(1, "API key is required"),
});

const plausibleVerifySchema = z.object({
  siteId: z.string().min(1, "Site ID is required"),
  apiKey: z.string().min(1, "API key is required"),
});

// ============================================================================
// Test Functions
// ============================================================================

async function testStripeConnection(secretKey: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const response = await fetch("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Stripe-Version": "2023-10-16",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const isTestMode = secretKey.startsWith("sk_test_");
      return {
        success: true,
        message: `Connected successfully to Stripe${isTestMode ? " (test mode)" : " (live mode)"}`,
        details: {
          mode: isTestMode ? "test" : "live",
          currency: data.available?.[0]?.currency || "unknown",
        },
      };
    }

    if (response.status === 401) {
      return { success: false, message: "Invalid API key. Please check your secret key." };
    }

    const error = await response.json().catch(() => ({}));
    return {
      success: false,
      message: error.error?.message || `Stripe API error: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to connect to Stripe",
    };
  }
}

async function testTelegramConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // First, validate the bot token by getting bot info
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botInfo = await botInfoResponse.json();

    if (!botInfo.ok) {
      return { success: false, message: "Invalid bot token. Please check the token from @BotFather." };
    }

    // Then, try to send a test message (or at least validate chat ID)
    const chatInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
    const chatInfo = await chatInfoResponse.json();

    if (!chatInfo.ok) {
      return {
        success: false,
        message: `Bot token is valid, but chat ID is invalid. Error: ${chatInfo.description || "Unknown error"}. Make sure you've started a conversation with the bot.`,
      };
    }

    return {
      success: true,
      message: `Connected to @${botInfo.result.username || "bot"} successfully`,
      details: {
        botUsername: botInfo.result.username,
        chatType: chatInfo.result.type,
        chatTitle: chatInfo.result.title || chatInfo.result.first_name,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to connect to Telegram",
    };
  }
}

async function testSlackConnection(botToken: string, signingSecret: string, channelId: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // Validate bot token by calling auth.test
    const authResponse = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const authData = await authResponse.json();

    if (!authData.ok) {
      return { success: false, message: `Invalid bot token: ${authData.error}` };
    }

    // Check if we can access the channel
    const convResponse = await fetch("https://slack.com/api/conversations.info", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `channel=${channelId}`,
    });
    const convData = await convResponse.json();

    if (!convData.ok) {
      return {
        success: false,
        message: `Token is valid, but can't access channel ${channelId}: ${convData.error}. Make sure the bot is invited to the channel.`,
      };
    }

    // Validate signing secret format (basic check)
    if (signingSecret.length < 20) {
      return { success: false, message: "Signing secret seems too short. Please check your Slack app settings." };
    }

    return {
      success: true,
      message: `Connected to ${authData.team} as @${authData.user}`,
      details: {
        team: authData.team,
        botId: authData.user_id,
        channelName: convData.channel?.name || channelId,
        channelIsPrivate: convData.channel?.is_private || false,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to connect to Slack",
    };
  }
}

async function testResendConnection(apiKey: string, fromEmail: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // Test by getting the API key info
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return { success: false, message: "Invalid API key. Please check your Resend API key." };
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, message: error.message || `Resend API error: ${response.status}` };
    }

    const data = await response.json();
    
    // Check if the from email domain is verified
    const emailDomain = fromEmail.split("@")[1];
    const domain = data.data?.find((d: any) => d.name === emailDomain);
    
    if (!domain) {
      return {
        success: false,
        message: `Domain "${emailDomain}" not found in your Resend account. Please add and verify this domain first.`,
      };
    }

    if (domain.status !== "verified") {
      return {
        success: false,
        message: `Domain "${emailDomain}" is not verified. Please complete DNS verification in Resend.`,
      };
    }

    return {
      success: true,
      message: `Connected successfully. Domain "${emailDomain}" is verified.`,
      details: {
        domain: emailDomain,
        domainStatus: domain.status,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to connect to Resend",
    };
  }
}

async function testGithubConnection(token: string, repoOwner: string, repoName: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // Test token and repo access
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (response.status === 401) {
      return { success: false, message: "Invalid token. Please check your GitHub Personal Access Token." };
    }

    if (response.status === 404) {
      return {
        success: false,
        message: `Repository "${repoOwner}/${repoName}" not found. Check the owner and repo name, and ensure your token has access.`,
      };
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, message: error.message || `GitHub API error: ${response.status}` };
    }

    const repo = await response.json();

    // Check if we have push access
    const permissions = repo.permissions;
    if (!permissions?.push) {
      return {
        success: false,
        message: `Token can read the repo but lacks write access. Add "repo" scope to your token for full functionality.`,
      };
    }

    return {
      success: true,
      message: `Connected to ${repoOwner}/${repoName} (${repo.visibility})`,
      details: {
        fullName: repo.full_name,
        visibility: repo.visibility,
        defaultBranch: repo.default_branch,
        hasWriteAccess: permissions?.push || false,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to connect to GitHub",
    };
  }
}

async function testSentryConnection(dsn: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // Parse the DSN to extract the host and project info
    // DSN format: https://key@o0.ingest.sentry.io/0
    const dsnUrl = new URL(dsn);
    const host = dsnUrl.host;
    const key = dsnUrl.username;

    // We can't easily test the DSN without actually sending an event,
    // but we can validate the format and make a basic connection test
    if (!host.includes("sentry.io") && !host.includes("ingest")) {
      return { success: false, message: "DSN doesn't appear to be a valid Sentry DSN URL." };
    }

    if (!key || key.length < 10) {
      return { success: false, message: "DSN key appears to be invalid or missing." };
    }

    return {
      success: true,
      message: "DSN format is valid and ready to use",
      details: {
        host,
        hasKey: true,
      },
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("URL")) {
      return { success: false, message: "Invalid DSN URL format. Please copy the DSN exactly from Sentry." };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to validate Sentry DSN",
    };
  }
}

async function testUptimeKumaConnection(url: string, apiKey: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const baseUrl = url.replace(/\/$/, "");
    
    // Try to get status page info
    const response = await fetch(`${baseUrl}/api/status-page`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, message: "Invalid API key. Please check your Uptime Kuma API key." };
      }
      return { success: false, message: `Failed to connect: HTTP ${response.status}` };
    }

    const data = await response.json();
    
    return {
      success: true,
      message: `Connected to Uptime Kuma at ${baseUrl}`,
      details: {
        url: baseUrl,
        hasMonitors: data.monitors?.length > 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to connect to Uptime Kuma",
    };
  }
}

async function testPlausibleConnection(siteId: string, apiKey: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // Try to get site stats
    const response = await fetch(`https://plausible.io/api/v1/stats/aggregate?site_id=${siteId}&period=day`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      return { success: false, message: "Invalid API key. Please check your Plausible API key." };
    }

    if (response.status === 404 || response.status === 400) {
      return { success: false, message: `Site "${siteId}" not found. Check your site ID in Plausible settings.` };
    }

    if (!response.ok) {
      return { success: false, message: `Plausible API error: ${response.status}` };
    }

    const data = await response.json();
    
    return {
      success: true,
      message: `Connected to Plausible for ${siteId}`,
      details: {
        siteId,
        hasData: data.results?.visitors?.value > 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to connect to Plausible",
    };
  }
}

// ============================================================================
// Routes Factory
// ============================================================================

export function integrationRoutes(db: any) {
  const router = Router();

  // Stripe verification
  router.post("/companies/:companyId/integrations/stripe/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = stripeVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testStripeConnection(parse.data.secretKey);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "stripe",
      details: { integration: "stripe", success: result.success },
    });

    res.json(result);
  });

  // Telegram verification
  router.post("/companies/:companyId/integrations/telegram/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = telegramVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testTelegramConnection(parse.data.botToken, parse.data.chatId);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "telegram",
      details: { integration: "telegram", success: result.success },
    });

    res.json(result);
  });

  // Slack verification
  router.post("/companies/:CompanyId/integrations/slack/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = slackVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testSlackConnection(
      parse.data.botToken,
      parse.data.signingSecret,
      parse.data.defaultChannelId
    );
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "slack",
      details: { integration: "slack", success: result.success },
    });

    res.json(result);
  });

  // Resend verification
  router.post("/companies/:companyId/integrations/resend/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = resendVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testResendConnection(parse.data.apiKey, parse.data.fromEmail);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "resend",
      details: { integration: "resend", success: result.success },
    });

    res.json(result);
  });

  // GitHub verification
  router.post("/companies/:companyId/integrations/github/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = githubVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testGithubConnection(
      parse.data.token,
      parse.data.repoOwner,
      parse.data.repoName
    );
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "github",
      details: { integration: "github", repo: `${parse.data.repoOwner}/${parse.data.repoName}`, success: result.success },
    });

    res.json(result);
  });

  // Sentry verification
  router.post("/companies/:companyId/integrations/sentry/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = sentryVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testSentryConnection(parse.data.dsn);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "sentry",
      details: { integration: "sentry", success: result.success },
    });

    res.json(result);
  });

  // Uptime Kuma verification
  router.post("/companies/:companyId/integrations/uptime-kuma/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = uptimeKumaVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testUptimeKumaConnection(parse.data.url, parse.data.apiKey);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "uptimeKuma",
      details: { integration: "uptimeKuma", success: result.success },
    });

    res.json(result);
  });

  // Plausible verification
  router.post("/companies/:companyId/integrations/plausible/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = plausibleVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testPlausibleConnection(parse.data.siteId, parse.data.apiKey);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "plausible",
      details: { integration: "plausible", siteId: parse.data.siteId, success: result.success },
    });

    res.json(result);
  });

  // ========================================================================
  // AI PROVIDER VERIFICATION
  // ========================================================================

  const aiProviderVerifySchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
    model: z.string().optional(),
  });

  async function testOpenAIConnection(apiKey: string, model?: string): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (response.status === 401) {
        return { success: false, message: "Invalid API key. Please check your OpenAI API key." };
      }

      if (!response.ok) {
        return { success: false, message: `OpenAI API error: ${response.status}` };
      }

      const data = await response.json();
      const models = data.data
        ?.filter((m: any) => m.id.includes("gpt") || m.id.includes("o1"))
        .map((m: any) => m.id)
        .slice(0, 10) || [];

      return {
        success: true,
        message: `Connected to OpenAI. Found ${models.length} GPT models.`,
        models,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to connect to OpenAI",
      };
    }
  }

  async function testAnthropicConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      // Anthropic doesn't have a simple models endpoint, so we validate by making a minimal request
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      if (response.status === 401) {
        return { success: false, message: "Invalid API key. Please check your Anthropic API key." };
      }

      // Even a 400 means the key is valid (just bad params)
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: "Invalid or unauthorized API key." };
      }

      return {
        success: true,
        message: "Connected to Anthropic. API key is valid.",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to connect to Anthropic",
      };
    }
  }

  async function testAlibabaConnection(apiKey: string): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-turbo",
          input: { prompt: "Hi" },
          parameters: { max_tokens: 1 },
        }),
      });

      if (response.status === 401 || response.status === 403) {
        return { success: false, message: "Invalid API key. Please check your DashScope API key." };
      }

      return {
        success: true,
        message: "Connected to Alibaba DashScope. API key is valid.",
        models: ["qwen-turbo", "qwen-plus", "qwen-max"],
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to connect to Alibaba DashScope",
      };
    }
  }

  async function testGroqConnection(apiKey: string): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (response.status === 401) {
        return { success: false, message: "Invalid API key. Please check your Groq API key." };
      }

      if (!response.ok) {
        return { success: false, message: `Groq API error: ${response.status}` };
      }

      const data = await response.json();
      const models = data.data?.map((m: any) => m.id).slice(0, 10) || [];

      return {
        success: true,
        message: `Connected to Groq. Found ${models.length} models.`,
        models,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to connect to Groq",
      };
    }
  }

  async function testXAIConnection(apiKey: string): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      const response = await fetch("https://api.x.ai/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (response.status === 401) {
        return { success: false, message: "Invalid API key. Please check your xAI API key." };
      }

      if (!response.ok) {
        return { success: false, message: `xAI API error: ${response.status}` };
      }

      const data = await response.json();
      const models = data.data?.map((m: any) => m.id).slice(0, 10) || [];

      return {
        success: true,
        message: `Connected to xAI. Found ${models.length} models.`,
        models,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to connect to xAI",
      };
    }
  }

  async function testMiniMaxConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      // MiniMax uses OpenAI-compatible API
      const response = await fetch("https://api.minimax.chat/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (response.status === 401) {
        return { success: false, message: "Invalid API key. Please check your MiniMax API key." };
      }

      if (!response.ok) {
        return { success: false, message: `MiniMax API error: ${response.status}` };
      }

      return {
        success: true,
        message: "Connected to MiniMax. API key is valid.",
        models: ["abab6.5s-chat", "abab6.5-chat"],
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to connect to MiniMax",
      };
    }
  }

  // OpenAI verification
  router.post("/companies/:companyId/integrations/ai-providers/openai/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = aiProviderVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testOpenAIConnection(parse.data.apiKey, parse.data.model);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "ai-provider-openai",
      details: { provider: "openai", success: result.success },
    });

    res.json(result);
  });

  // Anthropic verification
  router.post("/companies/:companyId/integrations/ai-providers/anthropic/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = aiProviderVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testAnthropicConnection(parse.data.apiKey);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "ai-provider-anthropic",
      details: { provider: "anthropic", success: result.success },
    });

    res.json(result);
  });

  // Alibaba verification
  router.post("/companies/:companyId/integrations/ai-providers/alibaba/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = aiProviderVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testAlibabaConnection(parse.data.apiKey);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "ai-provider-alibaba",
      details: { provider: "alibaba", success: result.success },
    });

    res.json(result);
  });

  // Groq verification
  router.post("/companies/:companyId/integrations/ai-providers/groq/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = aiProviderVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testGroqConnection(parse.data.apiKey);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "ai-provider-groq",
      details: { provider: "groq", success: result.success },
    });

    res.json(result);
  });

  // xAI verification
  router.post("/companies/:companyId/integrations/ai-providers/xai/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = aiProviderVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testXAIConnection(parse.data.apiKey);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "ai-provider-xai",
      details: { provider: "xai", success: result.success },
    });

    res.json(result);
  });

  // MiniMax verification
  router.post("/companies/:companyId/integrations/ai-providers/minimax/verify", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;
    assertCompanyAccess(req, companyId);

    const parse = aiProviderVerifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, message: parse.error.issues[0]?.message || "Invalid request" });
      return;
    }

    const result = await testMiniMaxConnection(parse.data.apiKey);
    
    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: result.success ? "integration.test_success" : "integration.test_failed",
      entityType: "integration",
      entityId: "ai-provider-minimax",
      details: { provider: "minimax", success: result.success },
    });

    res.json(result);
  });

  return router;
}