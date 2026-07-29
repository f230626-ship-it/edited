/**
 * Email dispatch with provider fallback chain.
 *
 * Provider selection (in priority order):
 *   1. EMAIL_PROVIDER=brevo  → uses Brevo (300/day free)
 *   2. EMAIL_PROVIDER=resend → uses Resend (100/day free)
 *   3. No env var set        → skip custom sending; Supabase's own SMTP
 *                              handles auth emails (resetPasswordForEmail,
 *                              signUp verification). This is the implicit
 *                              fallback for pure Supabase auth flows.
 *
 * For explicit custom emails (e.g. welcome emails, notifications) set
 * EMAIL_PROVIDER and the corresponding API key + EMAIL_FROM.
 *
 * Logs failures server-side only; never surfaces provider errors to clients.
 */
import type { EmailPayload, EmailResult } from "@/lib/email/types";
import { brevoProvider } from "@/lib/email/providers/brevo";
import { resendProvider } from "@/lib/email/providers/resend";

type ProviderName = "brevo" | "resend";

const PROVIDERS = {
  brevo: brevoProvider,
  resend: resendProvider,
} as const;

/**
 * Send an email using the configured provider.
 * Returns { ok: false } if no provider is configured — callers must
 * handle this and fall back to Supabase's built-in emails where applicable.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const providerName = (process.env.EMAIL_PROVIDER ?? "").toLowerCase() as
    | ProviderName
    | "";

  if (!providerName || !(providerName in PROVIDERS)) {
    // No custom provider configured — Supabase auth emails handle delivery
    return {
      ok: false,
      error: "No EMAIL_PROVIDER configured. Supabase built-in email will be used.",
    };
  }

  const provider = PROVIDERS[providerName];
  const result = await provider.send(payload);

  if (!result.ok) {
    console.error(
      `[email] Provider "${provider.name}" failed:`,
      result.error
    );
  }

  return result;
}

/**
 * Build the password-reset email body.
 * Called from the requestPasswordReset action when a custom provider is
 * configured AND you want to send a custom-branded email instead of
 * relying on Supabase's generic reset email.
 *
 * In that case you would: generate a Supabase OTP link via the admin API,
 * then send it through this function.
 */
export function buildPasswordResetEmail(
  resetUrl: string,
  recipientEmail: string
): EmailPayload {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "MindVista HRMS";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app";

  return {
    to: recipientEmail,
    subject: `Reset your ${appName} password`,
    text: [
      `You requested a password reset for your ${appName} account.`,
      "",
      `Reset link (expires in 15 minutes):`,
      resetUrl,
      "",
      `If you did not request this, you can safely ignore this email.`,
      "",
      `— The ${appName} team`,
      appUrl,
    ].join("\n"),
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <tr><td style="padding:32px 32px 16px;text-align:center">
          <img src="${appUrl}/images/mindvista-official-logo-light.png" alt="${appName}" width="160" style="max-width:160px;height:auto;border:none;outline:none" />
        </td></tr>
        <tr><td style="padding:0 32px 24px;text-align:center">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a">Reset Your Password</h1>
          <p style="margin:0;font-size:15px;color:#475569;line-height:1.6">
            We received a request to reset your ${appName} password.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px">
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6">
            Click the button below to create a new password.
          </p>
          <div style="text-align:center;margin:0 0 24px">
            <a href="${resetUrl}"
               style="display:inline-block;padding:14px 32px;background:#f59e0b;color:#0f172a;
                      font-size:15px;font-weight:700;text-decoration:none;border-radius:8px">
              Reset Password
            </a>
          </div>
          <p style="margin:0 0 32px;font-size:14px;color:#64748b;line-height:1.5">
            If you didn't request this, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:13px;color:#94a3b8;font-weight:600">
            ${appName}
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">
            Automated Security Notification
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

/**
 * Build the email-verification email body.
 * Used when a custom provider is configured for signup verification.
 */
export function buildVerificationEmail(
  verifyUrl: string,
  recipientEmail: string
): EmailPayload {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "MindVista HRMS";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app";

  return {
    to: recipientEmail,
    subject: `Verify your ${appName} email address`,
    text: [
      `Welcome to ${appName}!`,
      "",
      `Please verify your email address by visiting:`,
      verifyUrl,
      "",
      `This link expires in 24 hours.`,
      "",
      `— The ${appName} team`,
      appUrl,
    ].join("\n"),
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden">
        <tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #1a1a1a">
          <span style="font-size:20px;font-weight:700;color:#fff">${appName}</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#fff">Verify your email</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#999;line-height:1.6">
            Thanks for signing up! Click below to verify your email address and activate your account.
          </p>
          <a href="${verifyUrl}"
             style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;
                    font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">
            Verify email
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#666">
            Or copy this URL:<br>
            <span style="word-break:break-all;color:#888">${verifyUrl}</span>
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #1a1a1a;text-align:center">
          <p style="margin:0;font-size:12px;color:#555">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
