/**
 * AI Provider Configuration
 * 
 * Defines what each AI provider needs for easy setup.
 * Following the same pattern as business integrations.
 */

import {
  Sparkles,
  Bot,
  Cloud,
  Zap,
  Atom,
  Brain,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type AIProviderField = {
  key: string;
  label: string;
  type: "password" | "text" | "url";
  required: boolean;
  hint: string;
  placeholder?: string;
  docsUrl?: string;
  docsLabel?: string;
};

export type AIProviderConfig = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  secretName: string;
  envVars: string[];
  fields: AIProviderField[];
  supportsModelSelection: boolean;
  defaultModel?: string;
  popularModels?: string[];
  testEndpoint: string;
  setupGuide?: string;
  setupTime?: string;
};

// ============================================================================
// AI Provider Configurations
// ============================================================================

export const AI_PROVIDER_CONFIGS: Record<string, AIProviderConfig> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4, GPT-4o, and o1 models for agents. Supports codex_local and process adapters.",
    icon: Sparkles,
    secretName: "provider-openai-api-key",
    envVars: ["OPENAI_API_KEY"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Get your API key from OpenAI Platform. Use sk-... keys.",
        placeholder: "sk-...",
        docsUrl: "https://platform.openai.com/api-keys",
        docsLabel: "Get API key",
      },
    ],
    supportsModelSelection: true,
    defaultModel: "gpt-4o",
    popularModels: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
    testEndpoint: "/integrations/ai-providers/openai/verify",
    setupGuide: "https://platform.openai.com/docs/quickstart",
    setupTime: "1 minute",
  },

  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models (Opus, Sonnet, Haiku) for claude_local agents.",
    icon: Bot,
    secretName: "provider-anthropic-api-key",
    envVars: ["ANTHROPIC_API_KEY"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Get your API key from Anthropic Console.",
        placeholder: "sk-ant-...",
        docsUrl: "https://console.anthropic.com/settings/keys",
        docsLabel: "Get API key",
      },
    ],
    supportsModelSelection: false,
    testEndpoint: "/integrations/ai-providers/anthropic/verify",
    setupGuide: "https://docs.anthropic.com/claude/docs/quickstart",
    setupTime: "1 minute",
  },

  alibaba: {
    id: "alibaba",
    name: "Alibaba DashScope",
    description: "Qwen models via DashScope. OpenAI-compatible API for process adapters.",
    icon: Cloud,
    secretName: "provider-alibaba-api-key",
    envVars: ["ALIBABA_API_KEY", "DASHSCOPE_API_KEY"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Get your API key from Alibaba Cloud DashScope console.",
        docsUrl: "https://dashscope.console.aliyun.com/apiKey",
        docsLabel: "Get API key",
      },
    ],
    supportsModelSelection: true,
    popularModels: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-long"],
    testEndpoint: "/integrations/ai-providers/alibaba/verify",
    setupGuide: "https://help.aliyun.com/document_detail/2712195.html",
    setupTime: "2 minutes",
  },

  groq: {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference with LLaMA, Mixtral, and Gemma models.",
    icon: Zap,
    secretName: "provider-groq-api-key",
    envVars: ["GROQ_API_KEY"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Get your API key from GroqCloud console.",
        docsUrl: "https://console.groq.com/keys",
        docsLabel: "Get API key",
      },
    ],
    supportsModelSelection: true,
    popularModels: ["llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    testEndpoint: "/integrations/ai-providers/groq/verify",
    setupGuide: "https://console.groq.com/docs/quickstart",
    setupTime: "1 minute",
  },

  xai: {
    id: "xai",
    name: "xAI (Grok)",
    description: "Grok models from xAI for conversational AI.",
    icon: Atom,
    secretName: "provider-xai-api-key",
    envVars: ["XAI_API_KEY"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Get your API key from xAI console.",
        docsUrl: "https://console.x.ai/",
        docsLabel: "Get API key",
      },
    ],
    supportsModelSelection: true,
    popularModels: ["grok-beta"],
    testEndpoint: "/integrations/ai-providers/xai/verify",
    setupTime: "1 minute",
  },

  minimax: {
    id: "minimax",
    name: "MiniMax",
    description: "Chinese AI company with competitive models via OpenAI-compatible API.",
    icon: Brain,
    secretName: "provider-minimax-api-key",
    envVars: ["MINIMAX_API_KEY"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        hint: "Get your API key from MiniMax console.",
        docsUrl: "https://www.minimaxi.com/document/guides/chat-pro/api",
        docsLabel: "Get API key",
      },
    ],
    supportsModelSelection: true,
    popularModels: ["abab6.5s-chat", "abab6.5-chat"],
    testEndpoint: "/integrations/ai-providers/minimax/verify",
    setupTime: "2 minutes",
  },
};

// ============================================================================
// Helpers
// ============================================================================

export function getAIProviderConfig(id: string): AIProviderConfig | undefined {
  return AI_PROVIDER_CONFIGS[id];
}

export function getAllAIProviders(): AIProviderConfig[] {
  return Object.values(AI_PROVIDER_CONFIGS);
}