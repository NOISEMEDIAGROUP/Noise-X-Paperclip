import { describe, expect, it } from "vitest";

import { withFirstAgentCeoDefault } from "./new-agent-defaults";

describe("withFirstAgentCeoDefault", () => {
  it("fills empty values with CEO for first-agent setup", () => {
    expect(withFirstAgentCeoDefault("", true)).toBe("CEO");
  });

  it("fills whitespace-only values with CEO for first-agent setup", () => {
    expect(withFirstAgentCeoDefault("   ", true)).toBe("CEO");
  });

  it("preserves populated values for first-agent setup", () => {
    expect(withFirstAgentCeoDefault("Founder", true)).toBe("Founder");
  });

  it("does not alter values for non-first agents", () => {
    expect(withFirstAgentCeoDefault("", false)).toBe("");
    expect(withFirstAgentCeoDefault("Engineer", false)).toBe("Engineer");
  });
});
