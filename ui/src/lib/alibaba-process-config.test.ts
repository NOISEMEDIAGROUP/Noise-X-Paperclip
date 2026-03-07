import { describe, expect, it } from "vitest";
import { shouldAutoApplyAlibabaProcessConfig } from "./alibaba-process-config";

const ALIBABA_MODEL_PROFILE_IDS = [
  "exec_briefing",
  "engineering_delivery",
  "product_planning",
  "security_review",
  "qa_validation",
];

describe("shouldAutoApplyAlibabaProcessConfig", () => {
  it("returns false for generic process profile without Alibaba signals", () => {
    expect(
      shouldAutoApplyAlibabaProcessConfig({
        modelProvider: "",
        processRuntimeProfile: "portfolio_audit_script",
        modelProfileId: "",
        alibabaModelProfileIds: ALIBABA_MODEL_PROFILE_IDS,
        alibabaRuntimeProfileId: "alibaba_worker_python",
      }),
    ).toBe(false);
  });

  it("returns true when MODEL_PROVIDER is alibaba", () => {
    expect(
      shouldAutoApplyAlibabaProcessConfig({
        modelProvider: "Alibaba",
        processRuntimeProfile: "",
        modelProfileId: "",
        alibabaModelProfileIds: ALIBABA_MODEL_PROFILE_IDS,
        alibabaRuntimeProfileId: "alibaba_worker_python",
      }),
    ).toBe(true);
  });

  it("returns true for Alibaba runtime profile", () => {
    expect(
      shouldAutoApplyAlibabaProcessConfig({
        modelProvider: "",
        processRuntimeProfile: "alibaba_worker_python",
        modelProfileId: "",
        alibabaModelProfileIds: ALIBABA_MODEL_PROFILE_IDS,
        alibabaRuntimeProfileId: "alibaba_worker_python",
      }),
    ).toBe(true);
  });

  it("returns true for Alibaba model profile", () => {
    expect(
      shouldAutoApplyAlibabaProcessConfig({
        modelProvider: "",
        processRuntimeProfile: "",
        modelProfileId: "engineering_delivery",
        alibabaModelProfileIds: ALIBABA_MODEL_PROFILE_IDS,
        alibabaRuntimeProfileId: "alibaba_worker_python",
      }),
    ).toBe(true);
  });
});
