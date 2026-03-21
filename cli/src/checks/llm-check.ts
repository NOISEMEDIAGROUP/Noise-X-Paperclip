import type { PaperclipConfig } from "../config/schema.js";
import type { CheckResult } from "./index.js";

export async function llmCheck(config: PaperclipConfig): Promise<CheckResult> {
  if (!config.llm) {
    return {
      name: "LLM provider",
      status: "pass",
      message: "No LLM provider configured (optional)",
    };
  }

  if (!config.llm.apiKey) {
    return {
      name: "LLM provider",
      status: "pass",
      message: `${config.llm.provider} configured but no API key set (optional)`,
    };
  }

  try {
    if (config.llm.provider === "gemini") {
      const key = config.llm.apiKey;
      if (!key.startsWith("AIza") || key.length < 30) {
        return {
          name: "LLM provider",
          status: "fail",
          message: "Gemini API key format invalid (expected AIza... prefix, 39+ chars)",
          canRepair: false,
          repairHint: "Run `paperclipai configure --section llm` with a valid Google AI API key",
        };
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      );
      if (res.ok) {
        return { name: "LLM provider", status: "pass", message: "Gemini API key is valid" };
      }
      if (res.status === 400 || res.status === 403) {
        return {
          name: "LLM provider",
          status: "fail",
          message: `Gemini API key rejected (${res.status})`,
          canRepair: false,
          repairHint: "Run `paperclipai configure --section llm` with a valid Google AI API key",
        };
      }
      return { name: "LLM provider", status: "warn", message: `Gemini API returned status ${res.status}` };
    } else {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${config.llm.apiKey}` },
      });
      if (res.ok) {
        return { name: "LLM provider", status: "pass", message: "OpenAI API key is valid" };
      }
      if (res.status === 401) {
        return {
          name: "LLM provider",
          status: "fail",
          message: "OpenAI API key is invalid (401)",
          canRepair: false,
          repairHint: "Run `paperclipai configure --section llm`",
        };
      }
      return {
        name: "LLM provider",
        status: "warn",
        message: `OpenAI API returned status ${res.status}`,
      };
    }
  } catch {
    return {
      name: "LLM provider",
      status: "warn",
      message: "Could not reach API to validate key",
    };
  }
}
