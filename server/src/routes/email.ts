import { Router } from "express";
import { z } from "zod";
import { logger } from "../middleware/logger.js";

const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(500),
  html: z.string().optional(),
  text: z.string().optional(),
  from: z.string().optional(),
  replyTo: z.string().email().optional(),
}).refine((d) => d.html || d.text, { message: "Either html or text is required" });

export function emailRoutes() {
  const router = Router();

  router.post("/email/send", async (req, res) => {
    // Only allow authenticated actors (board users or agents)
    if (req.actor.type === "none") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "Email service not configured. Set RESEND_API_KEY." });
      return;
    }

    const parsed = sendEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const { to, subject, html, text, replyTo } = parsed.data;
    const from = parsed.data.from || process.env.RESEND_FROM_EMAIL || "Paperclip <onboarding@resend.dev>";

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
          reply_to: replyTo,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        logger.error({ status: response.status, result }, "Resend API error");
        res.status(response.status >= 500 ? 502 : 422).json({
          error: "Email delivery failed",
          details: result,
        });
        return;
      }

      logger.info(
        { to, subject, resendId: result.id, actor: req.actor.type },
        "Email sent successfully",
      );

      res.status(200).json({ success: true, id: result.id });
    } catch (err) {
      logger.error({ err }, "Failed to send email via Resend");
      res.status(500).json({ error: "Internal error sending email" });
    }
  });

  return router;
}
