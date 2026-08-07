/**
 * Build monthly period stats from parsed LinkedIn outreach rows.
 */

import type { ParsedLinkedInMessage } from "@/lib/linkedin/parser";

export interface MonthBucket {
  period_year: number;
  period_month: number;
  invites_sent: number;
  connections_made: number;
  messages_sent: number;
  initial_messages: number;
  follow_ups_sent: number;
  replies_received: number;
  is_partial: boolean;
}

export interface PeriodStatRow extends MonthBucket {
  acceptance_rate: number;
  reply_rate: number;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function ensureBucket(
  map: Map<string, MonthBucket>,
  year: number,
  month: number,
  isPartial: boolean
): MonthBucket {
  const key = monthKey(year, month);
  if (!map.has(key)) {
    map.set(key, {
      period_year: year,
      period_month: month,
      invites_sent: 0,
      connections_made: 0,
      messages_sent: 0,
      initial_messages: 0,
      follow_ups_sent: 0,
      replies_received: 0,
      is_partial: isPartial,
    });
  }
  return map.get(key)!;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Classify message KPIs by conversation:
 * - first outbound from owner = initial
 * - later outbounds = follow-ups
 * - inbound after at least one outbound = reply
 */
export function classifyMessagesByConversation(
  messages: ParsedLinkedInMessage[]
): {
  sent_at: string;
  is_initial: boolean;
  is_follow_up: boolean;
  is_reply: boolean;
}[] {
  const byConv = new Map<string, ParsedLinkedInMessage[]>();
  for (const msg of messages) {
    if (!msg.sent_at) continue;
    const key = msg.conversation_id || `${msg.from_name}|${msg.to_name}|solo`;
    if (!byConv.has(key)) byConv.set(key, []);
    byConv.get(key)!.push(msg);
  }

  const classified: {
    sent_at: string;
    is_initial: boolean;
    is_follow_up: boolean;
    is_reply: boolean;
  }[] = [];

  for (const list of byConv.values()) {
    list.sort((a, b) => String(a.sent_at).localeCompare(String(b.sent_at)));
    let outboundCount = 0;
    for (const msg of list) {
      if (!msg.sent_at) continue;
      if (msg.is_from_owner) {
        outboundCount += 1;
        classified.push({
          sent_at: msg.sent_at,
          is_initial: outboundCount === 1,
          is_follow_up: outboundCount > 1,
          is_reply: false,
        });
      } else {
        // Only count as a reply if the owner sent at least one outbound first.
        // Unsolicited inbound messages are not replies to outreach.
        if (outboundCount === 0) continue;
        classified.push({
          sent_at: msg.sent_at,
          is_initial: false,
          is_follow_up: false,
          is_reply: true,
        });
      }
    }
  }

  return classified;
}

function normalizeLinkedInUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.toLowerCase().match(/linkedin\.com\/in\/([^/?#]+)/);
  return m ? m[1].replace(/\/$/, "") : null;
}

function normalizePersonName(
  first?: string | null,
  last?: string | null
): string | null {
  const full = `${first || ""} ${last || ""}`
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  return full || null;
}

export function buildMonthlyPeriodStats(input: {
  invitations: {
    direction: string;
    invitation_date: string | null;
    invitee_profile_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  }[];
  connections: {
    connected_on: string | null;
    profile_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  }[];
  messages: ParsedLinkedInMessage[];
  isPartial: boolean;
}): PeriodStatRow[] {
  const map = new Map<string, MonthBucket>();

  // Only count connections that match someone we invited (acceptance),
  // not every historical row in Connections.csv.
  const invitedUrls = new Set<string>();
  const invitedNames = new Set<string>();

  for (const inv of input.invitations) {
    if (inv.direction !== "OUTGOING" || !inv.invitation_date) continue;
    const d = parseIsoDate(inv.invitation_date);
    if (!d) continue;
    ensureBucket(map, d.getUTCFullYear(), d.getUTCMonth() + 1, input.isPartial).invites_sent += 1;

    const slug = normalizeLinkedInUrl(inv.invitee_profile_url);
    if (slug) invitedUrls.add(slug);
    const name = normalizePersonName(inv.first_name, inv.last_name);
    if (name) invitedNames.add(name);
  }

  for (const conn of input.connections) {
    if (!conn.connected_on) continue;
    const slug = normalizeLinkedInUrl(conn.profile_url);
    const name = normalizePersonName(conn.first_name, conn.last_name);
    const matched =
      (slug != null && invitedUrls.has(slug)) ||
      (name != null && invitedNames.has(name));
    if (!matched) continue;

    const d = parseIsoDate(conn.connected_on);
    if (!d) continue;
    ensureBucket(map, d.getUTCFullYear(), d.getUTCMonth() + 1, input.isPartial)
      .connections_made += 1;
  }

  for (const msg of classifyMessagesByConversation(input.messages)) {
    const d = parseIsoDate(msg.sent_at);
    if (!d) continue;
    const bucket = ensureBucket(
      map,
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      input.isPartial
    );
    if (msg.is_initial || msg.is_follow_up) {
      bucket.messages_sent += 1;
      if (msg.is_initial) bucket.initial_messages += 1;
      if (msg.is_follow_up) bucket.follow_ups_sent += 1;
    }
    if (msg.is_reply) bucket.replies_received += 1;
  }

  return Array.from(map.values())
    .map((b) => {
      const acceptance_rate =
        b.invites_sent > 0
          ? parseFloat(((b.connections_made / b.invites_sent) * 100).toFixed(2))
          : 0;
      const reply_rate =
        b.messages_sent > 0
          ? parseFloat(((b.replies_received / b.messages_sent) * 100).toFixed(2))
          : 0;
      return { ...b, acceptance_rate, reply_rate };
    })
    .sort((a, b) => a.period_year - b.period_year || a.period_month - b.period_month);
}
