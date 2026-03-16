import { logger } from "../middleware/logger.js";

/**
 * Platform-specific message handlers for webhook events
 */

export interface TelegramMessage {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

export interface WhatsAppMessage {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: Array<{ profile?: { name: string }; wa_id: string }>;
  messages?: Array<{
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
  }>;
  statuses?: Array<{ id: string; status: string; timestamp: string }>;
}

export interface SlackEvent {
  type: string;
  token: string;
  team_id: string;
  user?: { id: string; username?: string };
  channel?: string;
  channel_id?: string;
  text?: string;
  ts?: string;
  event?: {
    type: string;
    user?: string;
    text?: string;
    channel?: string;
    ts?: string;
  };
}

/**
 * Telegram webhook handler
 */
export async function handleTelegramWebhook(
  payload: TelegramMessage
): Promise<{
  channelIdentifier: string;
  senderIdentifier: string;
  senderName?: string;
  content: string;
  platformMessageId: string;
} | null> {
  try {
    if (!payload.message) {
      return null;
    }

    const message = payload.message;
    if (!message.text) {
      return null;
    }

    return {
      channelIdentifier: String(message.chat.id),
      senderIdentifier: String(message.from?.id || "unknown"),
      senderName: message.from?.first_name || message.from?.username,
      content: message.text,
      platformMessageId: `tg-${payload.update_id}-${message.message_id}`,
    };
  } catch (error) {
    logger.error(`Failed to parse Telegram message: ${error}`);
    return null;
  }
}

/**
 * WhatsApp webhook handler
 */
export async function handleWhatsAppWebhook(
  payload: WhatsAppMessage
): Promise<{
  channelIdentifier: string;
  senderIdentifier: string;
  senderName?: string;
  content: string;
  platformMessageId: string;
} | null> {
  try {
    if (!payload.messages || payload.messages.length === 0) {
      return null;
    }

    const message = payload.messages[0];
    if (!message.text?.body) {
      return null;
    }

    const contact = payload.contacts?.[0];
    return {
      channelIdentifier: message.from,
      senderIdentifier: message.from,
      senderName: contact?.profile?.name,
      content: message.text.body,
      platformMessageId: `wa-${message.id}`,
    };
  } catch (error) {
    logger.error(`Failed to parse WhatsApp message: ${error}`);
    return null;
  }
}

/**
 * Slack webhook handler
 */
export async function handleSlackWebhook(
  payload: SlackEvent
): Promise<{
  channelIdentifier: string;
  senderIdentifier: string;
  senderName?: string;
  content: string;
  platformMessageId: string;
} | null> {
  try {
    if (payload.type === "url_verification") {
      // Slack verification challenge - return the challenge
      return null;
    }

    if (!payload.event) {
      return null;
    }

    const event = payload.event;
    if (event.type !== "message" || !event.text) {
      return null;
    }

    return {
      channelIdentifier: event.channel || payload.channel_id || "unknown",
      senderIdentifier: event.user || payload.user?.id || "unknown",
      senderName: payload.user?.username,
      content: event.text,
      platformMessageId: `slack-${payload.team_id}-${event.ts}`,
    };
  } catch (error) {
    logger.error(`Failed to parse Slack message: ${error}`);
    return null;
  }
}

/**
 * Email webhook handler (simplified for common email services)
 */
export async function handleEmailWebhook(
  payload: Record<string, any>
): Promise<{
  channelIdentifier: string;
  senderIdentifier: string;
  senderName?: string;
  content: string;
  platformMessageId: string;
} | null> {
  try {
    // Support common email webhook formats
    const from = payload.from || payload.sender || payload.email;
    const subject = payload.subject || "";
    const body = payload.body || payload.text || payload.content || "";

    if (!from || !body) {
      return null;
    }

    return {
      channelIdentifier: from,
      senderIdentifier: from,
      senderName: payload.name || payload.from_name,
      content: `**Subject:** ${subject}\n\n${body}`,
      platformMessageId: `email-${payload.message_id || Date.now()}`,
    };
  } catch (error) {
    logger.error(`Failed to parse email message: ${error}`);
    return null;
  }
}

/**
 * Send Telegram message
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: content,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: String(result.result?.message_id),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  toNumber: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = `https://graph.instagram.com/v18.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: { body: content },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.messages?.[0]?.id,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Send Slack message
 */
export async function sendSlackMessage(
  botToken: string,
  channel: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        text: content,
      }),
    });

    if (!response.ok) {
      return { success: false, error: "HTTP error" };
    }

    const result = await response.json();
    if (!result.ok) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      messageId: result.ts,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Send email message (SMTP)
 */
export async function sendEmailMessage(
  smtpConfig: {
    server: string;
    port: number;
    senderEmail: string;
    senderPassword: string;
  },
  toEmail: string,
  subject: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // In production, use nodemailer or similar
    // This is a placeholder that shows the structure
    logger.info(`Email would be sent to ${toEmail} via SMTP ${smtpConfig.server}`);

    return {
      success: true,
      messageId: `email-${Date.now()}`,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
