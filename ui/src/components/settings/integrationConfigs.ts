/**
 * Integration Configuration System
 * 
 * This file defines the schema for all supported integrations.
 * Each integration specifies:
 * - What fields it needs (with validation rules)
 * - How to test the connection
 * - Help text and documentation links
 * 
 * Adding a new integration:
 * 1. Add config here
 * 2. Add backend verify endpoint
 * 3. Modal will automatically work
 */

import {
  CreditCard,
  Mail,
  MessageCircle,
  Github,
  Bug,
  Activity,
  BarChart3,
  Slack,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type FieldType = "text" | "password" | "url" | "email" | "number";

export type IntegrationField = {
  /** Field key used in API calls */
  key: string;
  /** Human-readable label */
  label: string;
  /** Input type */
  type: FieldType;
  /** Whether this field is required to connect */
  required: boolean;
  /** Help text shown below the input */
  hint: string;
  /** Placeholder text */
  placeholder?: string;
  /** Validation pattern (regex string) */
  pattern?: string;
  /** Custom validation error message */
  patternError?: string;
  /** Link to documentation */
  docsUrl?: string;
  /** Label for docs link */
  docsLabel?: string;
};

export type IntegrationCategory = "payments" | "notifications" | "development" | "monitoring" | "analytics";

export type IntegrationConfig = {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Icon component */
  icon: LucideIcon;
  /** Category for grouping */
  category: IntegrationCategory;
  /** Fields needed to connect */
  fields: IntegrationField[];
  /** Secret name patterns used for this integration */
  secretNames: {
    /** Primary secret name pattern (supports {companyId} interpolation) */
    primary: string;
    /** Additional secret names */
    additional?: string[];
  };
  /** Business config fields to update */
  configFields: string[];
  /** Whether this integration supports testing */
  supportsTest: boolean;
  /** Test endpoint path (appended to /api/companies/:companyId) */
  testEndpoint: string;
  /** Setup guide URL */
  setupGuide?: string;
  /** Estimated setup time */
  setupTime?: string;
};

// ============================================================================
// Field Validators
// ============================================================================

export const FIELD_VALIDATORS = {
  stripeKey: {
    pattern: "^sk_(test|live)_[a-zA-Z0-9]+$",
    patternError: "Stripe keys start with 'sk_test_' or 'sk_live_' followed by alphanumeric characters",
  },
  telegramBotToken: {
    pattern: "^\\d+:[a-zA-Z0-9_-]+$",
    patternError: "Bot token format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  },
  telegramChatId: {
    pattern: "^-?\\d+$",
    patternError: "Chat ID should be a number (e.g., -1001234567890 or 123456789)",
  },
  slackChannelId: {
    pattern: "^[A-Z0-9]+$",
    patternError: "Channel ID format: C0123456789 (uppercase letters and numbers)",
  },
  email: {
    pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    patternError: "Please enter a valid email address",
  },
  url: {
    pattern: "^https?://[^\\s]+$",
    patternError: "Please enter a valid URL starting with http:// or https://",
  },
} as const;

// ============================================================================
// Integration Configurations
// ============================================================================

export const INTEGRATION_CONFIGS: Record<string, IntegrationConfig> = {
  // ========================================================================
  // PAYMENTS
  // ========================================================================
  
  stripe: {
    id: "stripe",
    name: "Stripe",
    description: "Accept payments, manage subscriptions, and sync revenue data automatically.",
    icon: CreditCard,
    category: "payments",
    fields: [
      {
        key: "secretKey",
        label: "Secret Key",
        type: "password",
        required: true,
        hint: "Find in Stripe Dashboard → Developers → API Keys. Use test keys for development.",
        placeholder: "sk_test_...",
        pattern: FIELD_VALIDATORS.stripeKey.pattern,
        patternError: FIELD_VALIDATORS.stripeKey.patternError,
        docsUrl: "https://dashboard.stripe.com/test/apikeys",
        docsLabel: "Get API keys",
      },
      {
        key: "webhookSecret",
        label: "Webhook Signing Secret",
        type: "password",
        required: false,
        hint: "Optional but recommended. Find in Stripe Dashboard → Developers → Webhooks. Click on a webhook to see the signing secret.",
        placeholder: "whsec_...",
        docsUrl: "https://dashboard.stripe.com/test/webhooks",
        docsLabel: "Setup webhooks",
      },
    ],
    secretNames: {
      primary: "business-stripe-secret-key",
      additional: ["business-stripe-webhook-secret"],
    },
    configFields: ["stripeSecretKeyName", "stripeWebhookSecretName"],
    supportsTest: true,
    testEndpoint: "/integrations/stripe/verify",
    setupGuide: "https://stripe.com/docs/keys",
    setupTime: "2 minutes",
  },

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================

  telegram: {
    id: "telegram",
    name: "Telegram",
    description: "Send notifications, daily briefs, and alerts to your Telegram chat.",
    icon: MessageCircle,
    category: "notifications",
    fields: [
      {
        key: "botToken",
        label: "Bot Token",
        type: "password",
        required: true,
        hint: "Create a bot via @BotFather on Telegram and copy the API token.",
        placeholder: "123456789:ABCdef...",
        pattern: FIELD_VALIDATORS.telegramBotToken.pattern,
        patternError: FIELD_VALIDATORS.telegramBotToken.patternError,
        docsUrl: "https://t.me/BotFather",
        docsLabel: "Create bot",
      },
      {
        key: "chatId",
        label: "Chat ID",
        type: "text",
        required: true,
        hint: "Your Telegram chat ID. Message @userinfobot to get your Chat ID.",
        placeholder: "-1001234567890",
        pattern: FIELD_VALIDATORS.telegramChatId.pattern,
        patternError: FIELD_VALIDATORS.telegramChatId.patternError,
        docsUrl: "https://t.me/userinfobot",
        docsLabel: "Get Chat ID",
      },
    ],
    secretNames: {
      primary: "business-telegram-bot-token",
    },
    configFields: ["telegramBotTokenSecretName", "telegramChatId", "telegramEnabled"],
    supportsTest: true,
    testEndpoint: "/integrations/telegram/verify",
    setupGuide: "https://core.telegram.org/bots#6-botfather",
    setupTime: "3 minutes",
  },

  slack: {
    id: "slack",
    name: "Slack",
    description: "Receive tasks from Slack messages and send agent responses back.",
    icon: Slack,
    category: "notifications",
    fields: [
      {
        key: "botToken",
        label: "Bot User OAuth Token",
        type: "password",
        required: true,
        hint: "Create a Slack App, add bot scopes, and install to workspace. Copy the Bot User OAuth Token.",
        placeholder: "xoxb-...",
        docsUrl: "https://api.slack.com/apps",
        docsLabel: "Create Slack App",
      },
      {
        key: "signingSecret",
        label: "Signing Secret",
        type: "password",
        required: true,
        hint: "Find in your Slack App settings under 'Basic Information'.",
        placeholder: "abc123...",
        docsUrl: "https://api.slack.com/apps",
        docsLabel: "App settings",
      },
      {
        key: "defaultChannelId",
        label: "Default Channel ID",
        type: "text",
        required: true,
        hint: "The channel ID where notifications will be sent by default. Right-click a channel → Copy Link → extract the ID.",
        placeholder: "C01234567",
        pattern: FIELD_VALIDATORS.slackChannelId.pattern,
        patternError: FIELD_VALIDATORS.slackChannelId.patternError,
      },
    ],
    secretNames: {
      primary: "business-slack-bot-token",
      additional: ["business-slack-signing-secret"],
    },
    configFields: ["slackBotTokenSecretName", "slackSigningSecretName", "slackDefaultChannelId", "slackEnabled"],
    supportsTest: true,
    testEndpoint: "/integrations/slack/verify",
    setupGuide: "https://api.slack.com/start/building/bolt",
    setupTime: "5 minutes",
  },

  resend: {
    id: "resend",
    name: "Email (Resend)",
    description: "Send transactional emails, welcome messages, and newsletters.",
    icon: Mail,
    category: "notifications",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Get your API key from Resend Dashboard. Use 're_' prefix keys.",
        placeholder: "re_...",
        docsUrl: "https://resend.com/api-keys",
        docsLabel: "Get API key",
      },
      {
        key: "fromEmail",
        label: "From Email Address",
        type: "email",
        required: true,
        hint: "The email address emails will be sent from. Must be a verified domain in Resend.",
        placeholder: "noreply@yourdomain.com",
        pattern: FIELD_VALIDATORS.email.pattern,
        patternError: FIELD_VALIDATORS.email.patternError,
        docsUrl: "https://resend.com/domains",
        docsLabel: "Verify domain",
      },
    ],
    secretNames: {
      primary: "business-resend-api-key",
    },
    configFields: ["resendApiKeySecretName", "resendFromEmail", "emailEnabled"],
    supportsTest: true,
    testEndpoint: "/integrations/resend/verify",
    setupGuide: "https://resend.com/docs/send-emails-with-resend",
    setupTime: "3 minutes",
  },

  // ========================================================================
  // DEVELOPMENT
  // ========================================================================

  github: {
    id: "github",
    name: "GitHub",
    description: "Link projects to GitHub repos for code awareness and PR integration.",
    icon: Github,
    category: "development",
    fields: [
      {
        key: "token",
        label: "Personal Access Token",
        type: "password",
        required: true,
        hint: "Create a Personal Access Token with 'repo' scope. Use a classic token for simplicity.",
        placeholder: "ghp_...",
        docsUrl: "https://github.com/settings/tokens/new?scopes=repo",
        docsLabel: "Create token",
      },
      {
        key: "repoOwner",
        label: "Repository Owner",
        type: "text",
        required: true,
        hint: "The GitHub username or organization that owns the repository.",
        placeholder: "your-username",
      },
      {
        key: "repoName",
        label: "Repository Name",
        type: "text",
        required: true,
        hint: "The name of the repository.",
        placeholder: "your-repo",
      },
    ],
    secretNames: {
      primary: "business-github-token",
    },
    configFields: ["githubTokenSecretName", "githubRepoOwner", "githubRepoName"],
    supportsTest: true,
    testEndpoint: "/integrations/github/verify",
    setupGuide: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token",
    setupTime: "3 minutes",
  },

  // ========================================================================
  // MONITORING
  // ========================================================================

  sentry: {
    id: "sentry",
    name: "Sentry",
    description: "Track errors and performance issues in your applications.",
    icon: Bug,
    category: "monitoring",
    fields: [
      {
        key: "dsn",
        label: "DSN (Data Source Name)",
        type: "password",
        required: true,
        hint: "Find in Project Settings → Client Keys. The DSN looks like: https://key@o0.ingest.sentry.io/0",
        placeholder: "https://...",
        docsUrl: "https://sentry.io/settings/",
        docsLabel: "Get DSN",
      },
    ],
    secretNames: {
      primary: "business-sentry-dsn",
    },
    configFields: ["sentryDsnSecretName"],
    supportsTest: true,
    testEndpoint: "/integrations/sentry/verify",
    setupGuide: "https://docs.sentry.io/product/sentry-basics/dsn-explainer/",
    setupTime: "2 minutes",
  },

  uptimeKuma: {
    id: "uptimeKuma",
    name: "Uptime Kuma",
    description: "Monitor endpoint availability and service health.",
    icon: Activity,
    category: "monitoring",
    fields: [
      {
        key: "url",
        label: "Uptime Kuma URL",
        type: "url",
        required: true,
        hint: "The URL of your Uptime Kuma instance.",
        placeholder: "https://uptime.yourdomain.com",
        pattern: FIELD_VALIDATORS.url.pattern,
        patternError: FIELD_VALIDATORS.url.patternError,
      },
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Generate an API key in Uptime Kuma Settings → API Keys.",
        placeholder: "uk_...",
      },
    ],
    secretNames: {
      primary: "business-uptime-kuma-api-key",
    },
    configFields: ["uptimeKumaUrl", "uptimeKumaApiKeySecretName"],
    supportsTest: true,
    testEndpoint: "/integrations/uptime-kuma/verify",
    setupTime: "3 minutes",
  },

  // ========================================================================
  // ANALYTICS
  // ========================================================================

  plausible: {
    id: "plausible",
    name: "Plausible",
    description: "Privacy-first web analytics for your products.",
    icon: BarChart3,
    category: "analytics",
    fields: [
      {
        key: "siteId",
        label: "Site ID",
        type: "text",
        required: true,
        hint: "The domain/site ID configured in Plausible.",
        placeholder: "yourdomain.com",
      },
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Generate an API key in your Plausible account settings.",
        placeholder: "plausible_...",
        docsUrl: "https://plausible.io/settings",
        docsLabel: "API settings",
      },
    ],
    secretNames: {
      primary: "business-plausible-api-key",
    },
    configFields: ["plausibleSiteId", "plausibleApiKeySecretName"],
    supportsTest: true,
    testEndpoint: "/integrations/plausible/verify",
    setupTime: "2 minutes",
  },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get integration config by ID
 */
export function getIntegrationConfig(id: string): IntegrationConfig | undefined {
  return INTEGRATION_CONFIGS[id];
}

/**
 * Get all integrations grouped by category
 */
export function getIntegrationsByCategory(): Record<IntegrationCategory, IntegrationConfig[]> {
  const grouped: Record<IntegrationCategory, IntegrationConfig[]> = {
    payments: [],
    notifications: [],
    development: [],
    monitoring: [],
    analytics: [],
  };
  
  for (const config of Object.values(INTEGRATION_CONFIGS)) {
    grouped[config.category].push(config);
  }
  
  return grouped;
}

/**
 * Get all integrations as array
 */
export function getAllIntegrations(): IntegrationConfig[] {
  return Object.values(INTEGRATION_CONFIGS);
}

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  payments: "Payments",
  notifications: "Notifications",
  development: "Development",
  monitoring: "Monitoring",
  analytics: "Analytics",
};

/**
 * Category descriptions
 */
export const CATEGORY_DESCRIPTIONS: Record<IntegrationCategory, string> = {
  payments: "Payment processing and subscription management",
  notifications: "Send alerts, briefs, and notifications",
  development: "Connect to your development tools",
  monitoring: "Track errors, uptime, and performance",
  analytics: "Understand user behavior and traffic",
};