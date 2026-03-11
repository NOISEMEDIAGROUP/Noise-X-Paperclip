import { describe, expect, it } from "vitest";
import {
  extractClaudeLoginUrl,
  extractClaudeManualCodePrompt,
} from "../services/claude-instance-subscription.ts";
import { normalizeClaudeOauthToken } from "../services/claude-oauth-token.ts";

describe("extractClaudeLoginUrl", () => {
  it("preserves oauth query parameters in Claude authorize urls", () => {
    const url = extractClaudeLoginUrl(
      "Open this URL in your browser:\nhttps://claude.ai/oauth/authorize?client_id=test-client&response_type=code&scope=org:create_api_key%20user:profile&state=abc123",
    );

    expect(url).toBe(
      "https://claude.ai/oauth/authorize?client_id=test-client&response_type=code&scope=org:create_api_key%20user:profile&state=abc123",
    );
  });

  it("strips trailing punctuation without trimming the query string", () => {
    const url = extractClaudeLoginUrl(
      "Login URL: https://claude.ai/oauth/authorize?client_id=test-client&response_type=code.",
    );

    expect(url).toBe(
      "https://claude.ai/oauth/authorize?client_id=test-client&response_type=code",
    );
  });

  it("reconstructs setup-token urls that are wrapped across terminal lines", () => {
    const url = extractClaudeLoginUrl(
      "Browser didn't open?\nhttps://claude.ai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-59\n44d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Fo\nauth%2Fcode%2Fcallback&scope=user%3Ainference&state=abc123",
    );

    expect(url).toBe(
      "https://claude.ai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&scope=user%3Ainference&state=abc123",
    );
  });
});

describe("extractClaudeManualCodePrompt", () => {
  it("detects the manual auth-code prompt from claude auth login output", () => {
    const prompt = extractClaudeManualCodePrompt(
      "Authentication Code\nPaste this into Claude Code:\nabc123\n\nPaste code here if prompted > ",
    );

    expect(prompt).toBe("Paste code here if prompted >");
  });
});

describe("normalizeClaudeOauthToken", () => {
  it("removes internal whitespace from wrapped setup-token output", () => {
    expect(
      normalizeClaudeOauthToken(
        "sk-ant-oat01-exampleTokenPartOne1234567890abcdef\nexampleTokenPartTwoZYXWVUT9876543210",
      ),
    ).toBe(
      "sk-ant-oat01-exampleTokenPartOne1234567890abcdefexampleTokenPartTwoZYXWVUT9876543210",
    );
  });
});
