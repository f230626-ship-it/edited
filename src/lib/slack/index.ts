/**
 * Slack Web API — thin wrapper with DNS-over-HTTPS fallback.
 * Uses DoH (dns.google) when system DNS is blocked by firewall.
 */

import https from "node:https";
import dns from "node:dns";
import { URL } from "node:url";

const SLACK_API = "https://slack.com/api";

function slackToken(): string {
  const t = process.env.SLACK_BOT_TOKEN;
  if (!t) throw new Error("SLACK_BOT_TOKEN env var is not set");
  return t;
}

/** Resolve hostname via system DNS first, fall back to DNS-over-HTTPS */
async function resolveHostname(hostname: string): Promise<string> {
  // Try system DNS first (fast, local)
  try {
    const addrs = await new Promise<string[]>((resolve, reject) => {
      dns.resolve4(hostname, (err, addresses) => {
        if (err || !addresses.length) reject(err || new Error("no addresses"));
        else resolve(addresses);
      });
    });
    return addrs[0];
  } catch {
    // System DNS failed — use DNS-over-HTTPS (port 443, bypasses firewall)
    try {
      const dohRes = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`,
        { signal: AbortSignal.timeout(5000) }
      );
      const dohData = (await dohRes.json()) as { Answer?: { data: string }[] };
      const ip = dohData.Answer?.find((a) => a.data && !a.data.includes(":"))?.data;
      if (ip) {
        console.log(`[Slack] DoH resolved ${hostname} → ${ip}`);
        return ip;
      }
    } catch {
      // DoH also failed
    }
    throw new Error(`Cannot resolve ${hostname} — both system DNS and DoH failed`);
  }
}

/** HTTPS request using DoH-resolved IP with TLS SNI */
function httpsPost(url: string, headers: Record<string, string>, body: string): Promise<Record<string, unknown>> {
  return new Promise(async (resolve, reject) => {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Resolve IP (system DNS → DoH fallback)
    let ip: string;
    try {
      ip = await resolveHostname(hostname);
    } catch (err) {
      reject(err);
      return;
    }

    const req = https.request(
      {
        hostname: ip,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          ...headers,
          Host: hostname,
          "Content-Length": Buffer.byteLength(body),
        },
        servername: hostname,
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON from Slack: ${data.slice(0, 200)}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Slack API request timed out"));
    });

    req.write(body);
    req.end();
  });
}

async function slackPost(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const payload = JSON.stringify(body);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    Authorization: `Bearer ${slackToken()}`,
  };

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const json = await httpsPost(`${SLACK_API}/${method}`, headers, payload);
      if (!json.ok) {
        console.error(`[Slack] ${method} failed:`, json.error);
      }
      return json;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Slack] ${method} attempt ${attempt}/5 failed: ${lastError.message}`);
      if (attempt < 5) {
        const delay = Math.min(attempt * 3000, 15000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/** Post a message to a channel. Returns the message timestamp (ts) for threading. */
export async function postSlackMessage(
  channel: string,
  text: string,
  blocks?: unknown[]
): Promise<string | null> {
  const payload: Record<string, unknown> = { channel, text };
  if (blocks?.length) payload.blocks = blocks;
  try {
    const res = await slackPost("chat.postMessage", payload);
    return res.ok ? (res.ts as string) : null;
  } catch (err) {
    console.error("[Slack] postSlackMessage error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Reply in a thread. */
export async function replyInThread(
  channel: string,
  threadTs: string,
  text: string
): Promise<void> {
  await slackPost("chat.postMessage", { channel, text, thread_ts: threadTs });
}

/** Update an existing message. */
export async function updateSlackMessage(
  channel: string,
  ts: string,
  text: string,
  blocks?: unknown[]
): Promise<void> {
  const payload: Record<string, unknown> = { channel, ts, text };
  if (blocks?.length) payload.blocks = blocks;
  await slackPost("chat.update", payload);
}

/** Build a Slack Block Kit reminder message with per-profile upload links. */
export function buildReminderBlocks(
  profiles: { name: string; profileId: string }[],
  appUrl: string,
  monthLabel: string
): unknown[] {
  const uploadLink = `${appUrl}/sales/linkedin`;

  return [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 LinkedIn Export Reminder — ${monthLabel}`, emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hi team! 👋\n\nThis is a monthly reminder to export and upload your LinkedIn data ZIP for *${monthLabel}*.\n\nPlease download your export from LinkedIn, then upload it to the dashboard to keep your outreach stats up to date.`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Upload LinkedIn Export", emoji: true },
          url: uploadLink,
          style: "primary",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `_Go to LinkedIn Settings > Data Privacy > Get a copy of your data > Request archive. Once ready, download the ZIP and upload it via the button above._`,
        },
      ],
    },
    { type: "divider" },
  ];
}
