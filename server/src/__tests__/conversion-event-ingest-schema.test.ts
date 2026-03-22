import { describe, expect, it } from "vitest";

import {
  conversionEventIngestSchema,
  conversionEventNames,
  conversionEventOwnershipMap,
  conversionSchemaVersionPolicy,
} from "@paperclipai/shared";

const basePayload = {
  eventId: "9a96a530-889a-4dc4-857f-9999a40dd24f",
  schemaVersion: conversionSchemaVersionPolicy.currentVersion,
  occurredAt: "2026-03-21T10:00:00.000Z",
  anonymousUserId: "anon_user_1234",
  source: "web" as const,
};

describe("conversionEventIngestSchema", () => {
  it("keeps ownership metadata aligned with the canonical event list", () => {
    const ownershipEventNames = Object.keys(conversionEventOwnershipMap).sort();
    const canonicalEventNames = [...conversionEventNames].sort();

    expect(ownershipEventNames).toEqual(canonicalEventNames);

    for (const eventName of conversionEventNames) {
      const ownership = conversionEventOwnershipMap[eventName];

      expect(ownership.requiredFields.length).toBeGreaterThan(0);
      expect(new Set(ownership.requiredFields).size).toBe(ownership.requiredFields.length);
      expect(new Set(ownership.optionalFields).size).toBe(ownership.optionalFields.length);
      expect(ownership.requiredFields.some((field) => ownership.optionalFields.includes(field))).toBe(false);
    }
  });

  it("accepts a valid signup_started payload", () => {
    const payload = {
      ...basePayload,
      eventName: "signup_started" as const,
      entryPoint: "landing_page" as const,
      campaignId: "spring-launch",
    };

    expect(conversionEventIngestSchema.parse(payload)).toEqual(payload);
  });

  it("preserves non-empty token field values without normalization", () => {
    const payload = {
      ...basePayload,
      eventName: "trial_started" as const,
      planCode: " pro ",
      trialLengthDays: 14,
      sessionId: " session-123 ",
    };

    expect(conversionEventIngestSchema.parse(payload)).toEqual(payload);
  });

  it("accepts timestamps with explicit timezone offsets", () => {
    const payload = {
      ...basePayload,
      occurredAt: "2026-03-21T10:00:00+02:00",
      eventName: "signup_started" as const,
      entryPoint: "pricing_page" as const,
    };

    expect(conversionEventIngestSchema.parse(payload)).toEqual(payload);
  });

  it("rejects unsupported schema versions", () => {
    const payload = {
      ...basePayload,
      schemaVersion: conversionSchemaVersionPolicy.currentVersion + 1,
      eventName: "signup_started" as const,
      entryPoint: "landing_page" as const,
    };

    const result = conversionEventIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("accepts valid payloads for all remaining event variants", () => {
    const signupCompletedPayload = {
      ...basePayload,
      eventName: "signup_completed" as const,
      signupMethod: "oauth_google" as const,
      referralCode: "ref-2026",
    };

    const trialStartedPayload = {
      ...basePayload,
      eventName: "trial_started" as const,
      planCode: "starter",
      trialLengthDays: 14,
      acquisitionChannel: "organic" as const,
    };

    const subscriptionStartedPayload = {
      ...basePayload,
      eventName: "subscription_started" as const,
      planCode: "pro",
      billingInterval: "monthly" as const,
      amountCents: 1900,
      currency: "USD",
    };

    expect(conversionEventIngestSchema.parse(signupCompletedPayload)).toEqual(signupCompletedPayload);
    expect(conversionEventIngestSchema.parse(trialStartedPayload)).toEqual(trialStartedPayload);
    expect(conversionEventIngestSchema.parse(subscriptionStartedPayload)).toEqual(subscriptionStartedPayload);
  });

  it("rejects unexpected fields because event payloads are strict", () => {
    const payload = {
      ...basePayload,
      eventName: "signup_completed" as const,
      signupMethod: "oauth_google" as const,
      unexpected: "field",
    };

    const result = conversionEventIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects missing event-specific required fields", () => {
    const payload = {
      ...basePayload,
      eventName: "trial_started" as const,
      trialLengthDays: 14,
    };

    const result = conversionEventIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects anonymous identifiers that are not anonymized tokens", () => {
    const payload = {
      ...basePayload,
      eventName: "signup_started" as const,
      entryPoint: "landing_page" as const,
      anonymousUserId: "person@email.com",
    };

    const result = conversionEventIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects invalid currency formats in subscription_started events", () => {
    const payload = {
      ...basePayload,
      eventName: "subscription_started" as const,
      planCode: "pro",
      billingInterval: "monthly" as const,
      amountCents: 1999,
      currency: "usd",
    };

    const result = conversionEventIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects negative subscription amounts", () => {
    const payload = {
      ...basePayload,
      eventName: "subscription_started" as const,
      planCode: "pro",
      billingInterval: "yearly" as const,
      amountCents: -10,
      currency: "USD",
    };

    const result = conversionEventIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects invalid trial length bounds", () => {
    const payload = {
      ...basePayload,
      eventName: "trial_started" as const,
      planCode: "starter",
      trialLengthDays: 366,
    };

    const result = conversionEventIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only token fields", () => {
    const payload = {
      ...basePayload,
      eventName: "subscription_started" as const,
      planCode: "pro",
      billingInterval: "monthly" as const,
      amountCents: 1999,
      currency: "USD",
      couponCode: "   ",
    };

    const result = conversionEventIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
