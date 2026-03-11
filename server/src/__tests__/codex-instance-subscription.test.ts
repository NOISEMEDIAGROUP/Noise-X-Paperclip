import { describe, expect, it } from "vitest";
import {
  extractCodexDeviceCode,
  extractCodexDeviceLoginUrl,
} from "../services/codex-instance-subscription.ts";

describe("extractCodexDeviceLoginUrl", () => {
  it("detects the Codex device-auth browser URL", () => {
    expect(
      extractCodexDeviceLoginUrl("Open https://auth.openai.com/codex/device to continue."),
    ).toBe("https://auth.openai.com/codex/device");
  });
});

describe("extractCodexDeviceCode", () => {
  it("detects the current 9-character device code format", () => {
    expect(
      extractCodexDeviceCode("Enter the following code in your browser: ABC123XYZ"),
    ).toBe("ABC123XYZ");
  });

  it("still detects the legacy hyphenated device code format", () => {
    expect(
      extractCodexDeviceCode("Use device code: ABCD-EFGH"),
    ).toBe("ABCD-EFGH");
  });
});
