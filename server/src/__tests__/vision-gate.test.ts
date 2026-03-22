import { describe, expect, it } from "vitest";
import {
  isVisionExemptIssue,
  parseMaxChildIssuesPerRun,
  shouldEnforceVisionGateForActor,
} from "../lib/vision-gate.js";

describe("vision-gate helpers", () => {
  describe("isVisionExemptIssue", () => {
    it("exempts critical priority issues", () => {
      expect(isVisionExemptIssue({ title: "Any", priority: "critical" })).toBe(true);
    });

    it("exempts issues tagged with NO_VISION", () => {
      expect(isVisionExemptIssue({ title: "[NO_VISION] ops patch" })).toBe(true);
      expect(isVisionExemptIssue({ description: "requires [no-vision] override" })).toBe(true);
    });

    it("exempts hotfix keywords", () => {
      expect(isVisionExemptIssue({ description: "Urgent regression on prod" })).toBe(true);
    });

    it("does not exempt normal execution items", () => {
      expect(
        isVisionExemptIssue({
          title: "Implement dashboard enhancements",
          description: "normal product work",
          priority: "high",
        }),
      ).toBe(false);
    });
  });

  describe("shouldEnforceVisionGateForActor", () => {
    const governedAgentRoles = new Set(["ceo", "cto", "pm", "cmo"]);

    it("enforces for governed agent roles", () => {
      expect(
        shouldEnforceVisionGateForActor({
          actorType: "agent",
          actorRole: "cto",
          enforceBoardVisionGate: false,
          governedAgentRoles,
        }),
      ).toBe(true);
    });

    it("skips for non-governed agent roles", () => {
      expect(
        shouldEnforceVisionGateForActor({
          actorType: "agent",
          actorRole: "engineer",
          enforceBoardVisionGate: false,
          governedAgentRoles,
        }),
      ).toBe(false);
    });

    it("uses board toggle for board actors", () => {
      expect(
        shouldEnforceVisionGateForActor({
          actorType: "board",
          enforceBoardVisionGate: true,
          governedAgentRoles,
        }),
      ).toBe(true);
      expect(
        shouldEnforceVisionGateForActor({
          actorType: "board",
          enforceBoardVisionGate: false,
          governedAgentRoles,
        }),
      ).toBe(false);
    });
  });

  describe("parseMaxChildIssuesPerRun", () => {
    it("parses positive values", () => {
      expect(parseMaxChildIssuesPerRun("7", 4)).toBe(7);
      expect(parseMaxChildIssuesPerRun("7.9", 4)).toBe(7);
    });

    it("falls back for invalid values", () => {
      expect(parseMaxChildIssuesPerRun(undefined, 4)).toBe(4);
      expect(parseMaxChildIssuesPerRun("0", 4)).toBe(4);
      expect(parseMaxChildIssuesPerRun("-3", 4)).toBe(4);
      expect(parseMaxChildIssuesPerRun("nan", 4)).toBe(4);
    });
  });
});
