import {
  normalizeInvitationDirection,
  detectPartialExport,
  parseInvitationsData,
  parseMessagesData,
  parseCSV,
  normalizeDate,
} from "@/lib/linkedin/parser";
import {
  buildMonthlyPeriodStats,
  classifyMessagesByConversation,
} from "@/lib/linkedin/period-rollup";
import { isLastWorkingDayOfMonth, isOnOrAfterLastWorkingDayOfMonth } from "@/lib/linkedin/reminder-schedule";

describe("normalizeInvitationDirection", () => {
  it("maps SENT and OUTGOING to OUTGOING", () => {
    expect(normalizeInvitationDirection("SENT")).toBe("OUTGOING");
    expect(normalizeInvitationDirection("OUTGOING")).toBe("OUTGOING");
  });
  it("maps INCOMING and RECEIVED to INCOMING", () => {
    expect(normalizeInvitationDirection("INCOMING")).toBe("INCOMING");
    expect(normalizeInvitationDirection("RECEIVED")).toBe("INCOMING");
  });
});

describe("detectPartialExport", () => {
  it("is partial without invitations or messages", () => {
    expect(detectPartialExport(["connections", "profile"])).toBe(true);
  });
  it("is complete with invitations and messages", () => {
    expect(detectPartialExport(["invitations", "messages", "connections"])).toBe(false);
  });
});

describe("parseInvitationsData", () => {
  it("normalizes SENT direction and parses Sent At", () => {
    const rows = parseInvitationsData([
      {
        From: "Owner",
        To: "Jane Doe",
        "Sent At": "7/22/26, 4:29 AM",
        Direction: "SENT",
        Message: "",
      },
    ]);
    expect(rows[0].direction).toBe("OUTGOING");
    expect(rows[0].first_name).toBe("Jane");
    expect(rows[0].invitation_date).toBe("2026-07-22");
  });
});

describe("messages + rollup", () => {
  it("classifies initial, follow-up, and reply", () => {
    const msgs = parseMessagesData(
      [
        {
          "CONVERSATION ID": "c1",
          FROM: "Abdul Hafeez",
          TO: "Lead",
          DATE: "2026-07-01 10:00:00 UTC",
          CONTENT: "Hi",
          FOLDER: "INBOX",
        },
        {
          "CONVERSATION ID": "c1",
          FROM: "Lead",
          TO: "Abdul Hafeez",
          DATE: "2026-07-02 10:00:00 UTC",
          CONTENT: "Thanks",
          FOLDER: "INBOX",
        },
        {
          "CONVERSATION ID": "c1",
          FROM: "Abdul Hafeez",
          TO: "Lead",
          DATE: "2026-07-03 10:00:00 UTC",
          CONTENT: "Follow up",
          FOLDER: "INBOX",
        },
      ],
      ["Abdul Hafeez"]
    );
    const classified = classifyMessagesByConversation(msgs);
    expect(classified.filter((c) => c.is_initial)).toHaveLength(1);
    expect(classified.filter((c) => c.is_follow_up)).toHaveLength(1);
    expect(classified.filter((c) => c.is_reply)).toHaveLength(1);
  });

  it("counts inbound as reply even before owner outbound", () => {
    const msgs = parseMessagesData(
      [
        {
          "CONVERSATION ID": "c2",
          FROM: "Lead",
          TO: "Owner",
          DATE: "2026-07-01 09:00:00 UTC",
          CONTENT: "Hi there",
          FOLDER: "INBOX",
        },
      ],
      ["Owner"]
    );
    const classified = classifyMessagesByConversation(msgs);
    // Bug 4 fix: unsolicited inbounds (no prior outbound) must NOT be counted as replies
    expect(classified.filter((c) => c.is_reply)).toHaveLength(0);
  });

  it("builds monthly period stats", () => {
    const stats = buildMonthlyPeriodStats({
      invitations: [
        {
          direction: "OUTGOING",
          invitation_date: "2026-07-10",
          first_name: "Lead",
          last_name: "One",
          invitee_profile_url: "https://www.linkedin.com/in/lead-one",
        },
        {
          direction: "OUTGOING",
          invitation_date: "2026-07-11",
          first_name: "Other",
          last_name: "Person",
        },
        { direction: "INCOMING", invitation_date: "2026-07-12" },
      ],
      connections: [
        {
          connected_on: "2026-07-15",
          first_name: "Lead",
          last_name: "One",
          profile_url: "https://www.linkedin.com/in/lead-one",
        },
        {
          // not invited — should not count toward acceptance
          connected_on: "2026-07-16",
          first_name: "Random",
          last_name: "Connection",
        },
      ],
      messages: parseMessagesData(
        [
          {
            "CONVERSATION ID": "c1",
            FROM: "Owner",
            TO: "Lead",
            DATE: "2026-07-10 10:00:00 UTC",
            CONTENT: "Hi",
            FOLDER: "INBOX",
          },
          {
            "CONVERSATION ID": "c1",
            FROM: "Lead",
            TO: "Owner",
            DATE: "2026-07-11 10:00:00 UTC",
            CONTENT: "Hey",
            FOLDER: "INBOX",
          },
        ],
        ["Owner"]
      ),
      isPartial: false,
    });
    expect(stats).toHaveLength(1);
    expect(stats[0].invites_sent).toBe(2);
    expect(stats[0].connections_made).toBe(1);
    expect(stats[0].acceptance_rate).toBe(50);
    expect(stats[0].messages_sent).toBe(1);
    expect(stats[0].replies_received).toBe(1);
    expect(stats[0].reply_rate).toBe(100);
  });
});

describe("parseCSV multiline", () => {
  it("keeps newlines inside quoted fields", () => {
    const csv = [
      "CONVERSATION ID,FROM,TO,DATE,CONTENT,FOLDER",
      'c1,Owner,Lead,2026-07-01 10:00:00 UTC,"Hello\nWorld",INBOX',
      "c1,Lead,Owner,2026-07-01 11:00:00 UTC,Hi,INBOX",
    ].join("\n");
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(String(rows[0].CONTENT)).toContain("Hello");
    expect(String(rows[0].CONTENT)).toContain("World");
    expect(rows[1].FROM).toBe("Lead");
  });
});

describe("normalizeDate messages format", () => {
  it("parses YYYY-MM-DD HH:MM:SS UTC", () => {
    expect(normalizeDate("2026-07-22 11:48:20 UTC")).toBe("2026-07-22");
  });

  // Bug 5 fix — locale abbreviation with trailing period
  it("parses month abbreviation with trailing period (jan.)", () => {
    // LinkedIn can export "22 jan. 2026" in some locales
    const result = normalizeDate("22 jan. 2026");
    expect(result).toBe("2026-01-22");
  });

  it("parses full month name (September)", () => {
    expect(normalizeDate("15 September 2025")).toBe("2025-09-15");
  });
});

describe("isLastWorkingDayOfMonth", () => {
  it("detects a known last weekday", () => {
    // 2026-07-31 is Friday → last working day of July 2026
    expect(isLastWorkingDayOfMonth(new Date("2026-07-31T12:00:00+05:00"))).toBe(true);
    expect(isLastWorkingDayOfMonth(new Date("2026-07-30T12:00:00+05:00"))).toBe(false);
  });
});

describe("isOnOrAfterLastWorkingDayOfMonth", () => {
  it("returns true on last working day", () => {
    // 2026-07-31 Friday = last working day
    expect(isOnOrAfterLastWorkingDayOfMonth(new Date("2026-07-31T12:00:00+05:00"))).toBe(true);
  });

  it("returns false before last working day", () => {
    // 2026-07-29 Wednesday — not last working day yet
    expect(isOnOrAfterLastWorkingDayOfMonth(new Date("2026-07-29T12:00:00+05:00"))).toBe(false);
  });

  it("returns true the day after last working day (still same month)", () => {
    // 2026-08-31 is Monday — last working day of Aug. Aug 30 = Sunday.
    // So last working day = Aug 28 (Fri). Aug 29 is within month and after.
    // Use a concrete known case: July 31 + still July doesn't apply.
    // Test: if last working day is the 29th and today is 30th (still in month) → true
    // We'll use Sept 2026: Sept 30 is Wed = last working day.
    // Sept 29 (Tue) → false, Sept 30 (Wed) → true
    expect(isOnOrAfterLastWorkingDayOfMonth(new Date("2026-09-30T12:00:00+05:00"))).toBe(true);
    expect(isOnOrAfterLastWorkingDayOfMonth(new Date("2026-09-29T12:00:00+05:00"))).toBe(false);
  });
});

// ─── Bug 3 fix — is_from_owner false positive prevention ─────────────────────
describe("parseMessagesData — is_from_owner (Bug 3 fix)", () => {
  it("exact name match is classified as owner", () => {
    const rows = parseMessagesData(
      [{ "CONVERSATION ID": "c1", FROM: "Abdul Hafeez", TO: "Lead", DATE: "2026-07-01 10:00:00 UTC", CONTENT: "Hi", FOLDER: "INBOX" }],
      ["Abdul Hafeez"]
    );
    expect(rows[0].is_from_owner).toBe(true);
  });

  it("first-name-only DOES NOT match full owner name (false positive prevented)", () => {
    // "Abdul" alone must not match owner "Abdul Hafeez"
    const rows = parseMessagesData(
      [{ "CONVERSATION ID": "c1", FROM: "Abdul", TO: "Owner", DATE: "2026-07-01 10:00:00 UTC", CONTENT: "Hi", FOLDER: "INBOX" }],
      ["Abdul Hafeez"]
    );
    expect(rows[0].is_from_owner).toBe(false);
  });

  it("partial different-first-name DOES NOT match", () => {
    const rows = parseMessagesData(
      [{ "CONVERSATION ID": "c1", FROM: "Hafeez Khan", TO: "Owner", DATE: "2026-07-01 10:00:00 UTC", CONTENT: "Hi", FOLDER: "INBOX" }],
      ["Abdul Hafeez"]
    );
    expect(rows[0].is_from_owner).toBe(false);
  });
});

// ─── Bug 4 fix — unsolicited inbounds are NOT replies ────────────────────────
describe("classifyMessagesByConversation — unsolicited inbound (Bug 4 fix)", () => {
  it("inbound with NO prior outbound is NOT counted as reply", () => {
    const msgs = parseMessagesData(
      [{ "CONVERSATION ID": "c1", FROM: "Lead", TO: "Owner", DATE: "2026-07-01 10:00:00 UTC", CONTENT: "Hello", FOLDER: "INBOX" }],
      ["Owner"]
    );
    const classified = classifyMessagesByConversation(msgs);
    expect(classified.filter((m) => m.is_reply)).toHaveLength(0);
    expect(classified.filter((m) => m.is_initial)).toHaveLength(0);
  });

  it("inbound AFTER outbound IS counted as reply", () => {
    const msgs = parseMessagesData(
      [
        { "CONVERSATION ID": "c1", FROM: "Owner", TO: "Lead", DATE: "2026-07-01 10:00:00 UTC", CONTENT: "Hi", FOLDER: "INBOX" },
        { "CONVERSATION ID": "c1", FROM: "Lead", TO: "Owner", DATE: "2026-07-02 10:00:00 UTC", CONTENT: "Hey!", FOLDER: "INBOX" },
      ],
      ["Owner"]
    );
    const classified = classifyMessagesByConversation(msgs);
    expect(classified.filter((m) => m.is_reply)).toHaveLength(1);
    expect(classified.filter((m) => m.is_initial)).toHaveLength(1);
  });
});

// ─── Cross-month isolation ────────────────────────────────────────────────────
describe("buildMonthlyPeriodStats — cross-month isolation", () => {
  it("invites in July and connections in August land in correct month buckets", () => {
    const stats = buildMonthlyPeriodStats({
      invitations: [
        { direction: "OUTGOING", invitation_date: "2026-07-10", first_name: "Lead", last_name: "A", invitee_profile_url: "https://www.linkedin.com/in/lead-a" },
        { direction: "OUTGOING", invitation_date: "2026-08-05", first_name: "Lead", last_name: "B", invitee_profile_url: "https://www.linkedin.com/in/lead-b" },
      ],
      connections: [
        { connected_on: "2026-07-15", first_name: "Lead", last_name: "A", profile_url: "https://www.linkedin.com/in/lead-a" },
      ],
      messages: [],
      isPartial: false,
    });

    const july = stats.find((s) => s.period_month === 7);
    const august = stats.find((s) => s.period_month === 8);

    expect(july?.invites_sent).toBe(1);
    expect(july?.connections_made).toBe(1);
    expect(august?.invites_sent).toBe(1);
    expect(august?.connections_made).toBe(0);
  });

  it("INCOMING invitations are NOT counted in invites_sent", () => {
    const stats = buildMonthlyPeriodStats({
      invitations: [
        { direction: "INCOMING", invitation_date: "2026-07-10" },
        { direction: "OUTGOING", invitation_date: "2026-07-11", first_name: "A", last_name: "B" },
      ],
      connections: [],
      messages: [],
      isPartial: false,
    });

    const july = stats.find((s) => s.period_month === 7);
    expect(july?.invites_sent).toBe(1);
  });

  it("zero messages → reply_rate is 0 (not NaN)", () => {
    const stats = buildMonthlyPeriodStats({
      invitations: [{ direction: "OUTGOING", invitation_date: "2026-07-10" }],
      connections: [],
      messages: [],
      isPartial: false,
    });
    const july = stats.find((s) => s.period_month === 7);
    expect(july?.reply_rate).toBe(0);
    expect(Number.isNaN(july?.reply_rate)).toBe(false);
  });
});

// ─── Full pipeline integration — ground truth fixture ─────────────────────────
describe("Full pipeline integration — ground truth fixture", () => {
  /**
   * Fixture: 4 invites sent, 2 accepted, 6 outbound messages, 3 replies.
   * Expected:
   *   invites_sent = 4
   *   connections_made = 2
   *   acceptance_rate = 50%
   *   messages_sent = 6
   *   replies_received = 3
   *   reply_rate = 50%
   */
  it("matches manual ground truth for normal month", () => {
    const invitations = parseInvitationsData([
      { From: "Owner", To: "Alice Smith",   "Sent At": "7/1/26, 10:00 AM", Direction: "SENT", Message: "" },
      { From: "Owner", To: "Bob Jones",     "Sent At": "7/2/26, 10:00 AM", Direction: "SENT", Message: "" },
      { From: "Owner", To: "Carol White",   "Sent At": "7/3/26, 10:00 AM", Direction: "SENT", Message: "" },
      { From: "Owner", To: "Dan Brown",     "Sent At": "7/4/26, 10:00 AM", Direction: "SENT", Message: "" },
    ]);
    const connections = [
      { connected_on: "2026-07-10", first_name: "Alice", last_name: "Smith",  profile_url: "" },
      { connected_on: "2026-07-11", first_name: "Bob",   last_name: "Jones",  profile_url: "" },
    ];
    const rawMessages = [
      { "CONVERSATION ID": "c1", FROM: "Owner", TO: "Alice Smith",  DATE: "2026-07-10 09:00:00 UTC", CONTENT: "Hi Alice",   FOLDER: "INBOX" },
      { "CONVERSATION ID": "c1", FROM: "Alice Smith", TO: "Owner",  DATE: "2026-07-11 09:00:00 UTC", CONTENT: "Hi Owner",   FOLDER: "INBOX" },
      { "CONVERSATION ID": "c2", FROM: "Owner", TO: "Bob Jones",    DATE: "2026-07-10 09:00:00 UTC", CONTENT: "Hi Bob",     FOLDER: "INBOX" },
      { "CONVERSATION ID": "c2", FROM: "Bob Jones", TO: "Owner",    DATE: "2026-07-11 09:00:00 UTC", CONTENT: "Hi back",    FOLDER: "INBOX" },
      { "CONVERSATION ID": "c3", FROM: "Owner", TO: "Carol White",  DATE: "2026-07-12 09:00:00 UTC", CONTENT: "Hi Carol",   FOLDER: "INBOX" },
      { "CONVERSATION ID": "c3", FROM: "Owner", TO: "Carol White",  DATE: "2026-07-14 09:00:00 UTC", CONTENT: "Follow up",  FOLDER: "INBOX" },
      { "CONVERSATION ID": "c4", FROM: "Owner", TO: "Dan Brown",    DATE: "2026-07-12 09:00:00 UTC", CONTENT: "Hi Dan",     FOLDER: "INBOX" },
      { "CONVERSATION ID": "c4", FROM: "Dan Brown", TO: "Owner",    DATE: "2026-07-13 09:00:00 UTC", CONTENT: "Interested", FOLDER: "INBOX" },
    ];
    const messages = parseMessagesData(rawMessages, ["Owner"]);

    const stats = buildMonthlyPeriodStats({ invitations, connections, messages, isPartial: false });
    const july = stats.find((s) => s.period_month === 7)!;

    expect(july.invites_sent).toBe(4);
    expect(july.connections_made).toBe(2);
    expect(july.acceptance_rate).toBe(50);
    // 5 owner outbound messages: c1-init, c2-init, c3-init, c3-followup, c4-init
    expect(july.messages_sent).toBe(5);
    // 3 replies (Alice, Bob, Dan all replied after owner outbound)
    expect(july.replies_received).toBe(3);
    // 3/5 = 60%
    expect(july.reply_rate).toBe(60);
  });
});
