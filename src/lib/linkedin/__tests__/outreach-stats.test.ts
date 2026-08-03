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
import { isLastWorkingDayOfMonth } from "@/lib/linkedin/reminder-schedule";

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
    expect(classified.filter((c) => c.is_reply)).toHaveLength(1);
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
});

describe("isLastWorkingDayOfMonth", () => {
  it("detects a known last weekday", () => {
    // 2026-07-31 is Friday → last working day of July 2026
    expect(isLastWorkingDayOfMonth(new Date("2026-07-31T12:00:00+05:00"))).toBe(true);
    expect(isLastWorkingDayOfMonth(new Date("2026-07-30T12:00:00+05:00"))).toBe(false);
  });
});
