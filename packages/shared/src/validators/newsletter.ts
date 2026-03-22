import { z } from "zod";

export const newsletterSubscribeSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(160).optional().nullable(),
});

export const newsletterCheckoutSchema = newsletterSubscribeSchema;

export const newsletterUnsubscribeSchema = z.object({
  email: z.string().email(),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
export type NewsletterCheckoutInput = z.infer<typeof newsletterCheckoutSchema>;
export type NewsletterUnsubscribeInput = z.infer<typeof newsletterUnsubscribeSchema>;
