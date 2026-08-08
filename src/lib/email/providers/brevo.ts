/**
 * Brevo (formerly Sendinblue) transactional email provider.
 * Free tier: 300 emails/day — more than enough for an HRMS.
 *
 * Required env vars:
 *   BREVO_API_KEY   — from https://app.brevo.com/settings/keys/api
 *   EMAIL_FROM      — verified sender address in your Brevo account
 *   EMAIL_FROM_NAME — display name for the sender (optional, defaults to "MindVista")
 *
 * IMPORTANT: The EMAIL_FROM address MUST be verified in Brevo dashboard
 * (https://app.brevo.com/settings/senders) before sending. Unverified senders
 * are silently dropped or rejected by Brevo.
 */
import type { EmailPayload, EmailProvider, EmailResult } from "@/lib/email/types";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

export const brevoProvider: EmailProvider = {
  name: "brevo",

  async send(payload: EmailPayload): Promise<EmailResult> {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;
    const fromName = process.env.EMAIL_FROM_NAME ?? "MindVista";

    if (!apiKey) {
      return {
        ok: false,
        provider: "brevo",
        error: "BREVO_API_KEY not configured in environment",
      };
    }

    if (!fromEmail) {
      return {
        ok: false,
        provider: "brevo",
        error: "EMAIL_FROM not configured in environment",
      };
    }

    // Mask API key for safe logging (show first 12 chars + last 4)
    const maskedKey = apiKey.length > 16
      ? `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}`
      : "***";

    console.log("[brevo] Sending email:", {
      to: payload.to,
      subject: payload.subject,
      from: `${fromName} <${fromEmail}>`,
      apiKeyPrefix: maskedKey,
    });

    try {
      const body: Record<string, unknown> = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: payload.to }],
        subject: payload.subject,
        textContent: payload.text,
      };

      if (payload.html) {
        body.htmlContent = payload.html;
      }

      if (payload.attachments && payload.attachments.length > 0) {
        body.attachment = payload.attachments.map((a) => ({
          name: a.name,
          content: a.content,
        }));
      }

      const response = await fetch(BREVO_SEND_URL, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      // Read response body for both success and error cases
      const responseText = await response.text();
      let responseData: Record<string, unknown> = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Response wasn't JSON — that's fine for error reporting
      }

      if (!response.ok) {
        const errorMsg = [
          `HTTP ${response.status}`,
          responseData.message || responseData.code || responseText,
          responseData.code ? `(code: ${responseData.code})` : "",
        ]
          .filter(Boolean)
          .join(" | ");

        console.error("[brevo] API error:", {
          status: response.status,
          code: responseData.code,
          message: responseData.message,
          fullResponse: responseText,
        });

        return {
          ok: false,
          provider: "brevo",
          error: errorMsg,
        };
      }

      // Success — log messageId for tracking in Brevo dashboard
      const messageId = responseData.messageId;
      console.log("[brevo] Email sent successfully:", {
        messageId,
        to: payload.to,
        subject: payload.subject,
      });

      return { ok: true, provider: "brevo" };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[brevo] Network/exception error:", errMsg);
      return {
        ok: false,
        provider: "brevo",
        error: errMsg,
      };
    }
  },
};
