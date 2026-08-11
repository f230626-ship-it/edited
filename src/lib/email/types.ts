/**
 * Minimal email payload for transactional auth emails.
 * Keep this narrow — only what auth flows need.
 */
export interface EmailAttachment {
  name: string;
  /** Base64-encoded content */
  content: string;
  contentType?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  /** Plain-text fallback (required for spam filters) */
  text: string;
  /** HTML body (optional but strongly recommended) */
  html?: string;
  /** File attachments (base64-encoded) */
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  ok: boolean;
  /** Provider name that succeeded */
  provider?: string;
  error?: string;
}

/**
 * Every email provider must implement this interface.
 * Add new providers by implementing it and registering
 * them in src/lib/email/index.ts.
 */
export interface EmailProvider {
  name: string;
  send(payload: EmailPayload): Promise<EmailResult>;
}
