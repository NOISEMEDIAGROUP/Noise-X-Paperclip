import { z } from "zod";

export const conversionEventNames = [
  "signup_started",
  "signup_completed",
  "trial_started",
  "subscription_started",
] as const;
export const conversionEventNameSchema = z.enum(conversionEventNames);
export type ConversionEventName = z.infer<typeof conversionEventNameSchema>;

export const conversionEventOwnerRoles = ["growth", "product", "finance", "backend"] as const;
export const conversionEventOwnerRoleSchema = z.enum(conversionEventOwnerRoles);
export type ConversionEventOwnerRole = z.infer<typeof conversionEventOwnerRoleSchema>;

export const conversionSchemaVersionPolicy = {
  minSupportedVersion: 1,
  currentVersion: 1,
} as const;

export interface ConversionEventOwnership {
  ownerRole: ConversionEventOwnerRole;
  requiredFields: readonly string[];
  optionalFields: readonly string[];
}

const baseRequiredFields = ["eventId", "schemaVersion", "occurredAt", "anonymousUserId", "source"] as const;

export const conversionEventOwnershipMap = {
  signup_started: {
    ownerRole: "growth",
    requiredFields: [...baseRequiredFields, "entryPoint"],
    optionalFields: ["sessionId", "campaignId", "referralCode"],
  },
  signup_completed: {
    ownerRole: "growth",
    requiredFields: [...baseRequiredFields, "signupMethod"],
    optionalFields: ["sessionId", "campaignId", "referralCode"],
  },
  trial_started: {
    ownerRole: "product",
    requiredFields: [...baseRequiredFields, "planCode", "trialLengthDays"],
    optionalFields: ["sessionId", "acquisitionChannel"],
  },
  subscription_started: {
    ownerRole: "finance",
    requiredFields: [...baseRequiredFields, "planCode", "billingInterval", "amountCents", "currency"],
    optionalFields: ["sessionId", "couponCode"],
  },
} as const satisfies Record<ConversionEventName, ConversionEventOwnership>;

export const conversionEventSourceSchema = z.enum(["web", "ios", "android", "backend"]);
export type ConversionEventSource = z.infer<typeof conversionEventSourceSchema>;

export const conversionBillingIntervalSchema = z.enum(["monthly", "yearly"]);
export type ConversionBillingInterval = z.infer<typeof conversionBillingIntervalSchema>;

function nonBlankString(maxLength: number) {
  return z.string().min(1).max(maxLength).regex(/\S/, "value must include a non-whitespace character");
}

const baseConversionEventSchema = z.object({
  eventId: z.string().uuid(),
  schemaVersion: z
    .number()
    .int()
    .min(conversionSchemaVersionPolicy.minSupportedVersion)
    .max(conversionSchemaVersionPolicy.currentVersion),
  occurredAt: z.string().datetime({ offset: true }),
  anonymousUserId: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/, "anonymousUserId must be an anonymized token"),
  sessionId: nonBlankString(128).optional(),
  source: conversionEventSourceSchema,
});

const signupStartedEventSchema = baseConversionEventSchema
  .extend({
    eventName: z.literal("signup_started"),
    entryPoint: z.enum(["landing_page", "pricing_page", "referral", "direct", "in_app_prompt"]),
    campaignId: nonBlankString(64).optional(),
    referralCode: nonBlankString(64).optional(),
  })
  .strict();

const signupCompletedEventSchema = baseConversionEventSchema
  .extend({
    eventName: z.literal("signup_completed"),
    signupMethod: z.enum(["email_password", "oauth_google", "oauth_apple", "sso"]),
    campaignId: nonBlankString(64).optional(),
    referralCode: nonBlankString(64).optional(),
  })
  .strict();

const trialStartedEventSchema = baseConversionEventSchema
  .extend({
    eventName: z.literal("trial_started"),
    planCode: nonBlankString(64),
    trialLengthDays: z.number().int().min(0).max(365),
    acquisitionChannel: z.enum(["organic", "paid", "referral", "partner", "unknown"]).optional(),
  })
  .strict();

const subscriptionStartedEventSchema = baseConversionEventSchema
  .extend({
    eventName: z.literal("subscription_started"),
    planCode: nonBlankString(64),
    billingInterval: conversionBillingIntervalSchema,
    amountCents: z.number().int().min(0),
    currency: z.string().regex(/^[A-Z]{3}$/, "currency must be an uppercase ISO-4217 code"),
    couponCode: nonBlankString(64).optional(),
  })
  .strict();

export const conversionEventIngestSchema = z.discriminatedUnion("eventName", [
  signupStartedEventSchema,
  signupCompletedEventSchema,
  trialStartedEventSchema,
  subscriptionStartedEventSchema,
]);

export type ConversionEventIngest = z.infer<typeof conversionEventIngestSchema>;
