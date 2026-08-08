"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const KPI_DEFS = [
  { key: "invitesSent" as const, label: "Invites Sent", color: "#f59e0b" },
  { key: "connectionsMade" as const, label: "Connections Made", color: "#0d9488" },
  { key: "acceptanceRate" as const, label: "Acceptance Rate", color: "#10b981", suffix: "%" },
  { key: "messagesSent" as const, label: "Messages Sent", color: "#8b5cf6" },
  { key: "followUpsSent" as const, label: "Follow-ups Sent", color: "#d97706" },
  { key: "repliesReceived" as const, label: "Replies Received", color: "#ec4899" },
  { key: "replyRate" as const, label: "Reply Rate", color: "#f43f5e", suffix: "%" },
];

interface ProfileRow {
  profileId: string;
  name: string;
  invitesSent: number;
  connectionsMade: number;
  acceptanceRate: number;
  messagesSent: number;
  followUpsSent: number;
  repliesReceived: number;
  replyRate: number;
}

interface Totals {
  invitesSent: number;
  connectionsMade: number;
  acceptanceRate: number;
  messagesSent: number;
  followUpsSent: number;
  repliesReceived: number;
  replyRate: number;
}

export function AllProfilesDashboard({
  month,
  profiles,
  totals,
}: {
  month: string;
  profiles: ProfileRow[];
  totals: Totals;
}) {
  const fmt = (n: number, suffix = "") => (suffix ? `${n.toFixed(1)}${suffix}` : String(n));

  const glanceData = profiles.map((p) => ({
    name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
    invites: p.invitesSent,
    connections: p.connectionsMade,
    messages: p.messagesSent,
    replies: p.repliesReceived,
  }));

  return (
    <div data-report="true" style={{ background: "#0a0e1a", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", padding: "30px 40px", width: 1400 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b" }}>MindVista HRMS</div>
        <div style={{ color: "#475569", fontSize: 13 }}>|</div>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>LinkedIn Monthly Report · {month}</div>
      </div>
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
        All profiles at a glance · {profiles.length} profile{profiles.length !== 1 ? "s" : ""} · Monthly granularity
      </div>

      {/* Combined KPI Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {KPI_DEFS.map((kpi) => {
          const val = totals[kpi.key];
          const display = kpi.suffix ? `${Number(val).toFixed(1)}${kpi.suffix}` : String(val);
          return (
            <div key={kpi.key} style={{ flex: 1, background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{display}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>combined total</div>
            </div>
          );
        })}
      </div>

      {/* All Profiles Table */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>All profiles at a glance</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["PROFILE", "INVITES SENT", "CONNECTIONS", "ACCEPTANCE RATE", "MESSAGES SENT", "FOLLOW-UPS", "REPLIES", "REPLY RATE"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, textTransform: "uppercase", color: "#94a3b8", padding: "10px 14px", borderBottom: "1px solid #1f2937", background: "#111827" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.profileId}>
                <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}><strong>{p.name}</strong></td>
                <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{p.invitesSent}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{p.connectionsMade}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{p.acceptanceRate.toFixed(1)}%</td>
                <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{p.messagesSent}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{p.followUpsSent}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{p.repliesReceived}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{p.replyRate.toFixed(1)}%</td>
              </tr>
            ))}
            {/* Totals row */}
            <tr style={{ background: "#111827" }}>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #1f2937" }}>TOTAL</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #1f2937", color: "#f59e0b" }}>{totals.invitesSent}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #1f2937", color: "#0d9488" }}>{totals.connectionsMade}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #1f2937", color: "#10b981" }}>{totals.acceptanceRate.toFixed(1)}%</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #1f2937", color: "#8b5cf6" }}>{totals.messagesSent}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #1f2937", color: "#d97706" }}>{totals.followUpsSent}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #1f2937", color: "#ec4899" }}>{totals.repliesReceived}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #1f2937", color: "#f43f5e" }}>{totals.replyRate.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bar chart: per-profile comparison */}
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Per-profile comparison</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>Invites sent &amp; connections made by profile</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={glanceData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
            <Bar dataKey="connections" fill="#0d9488" name="Connections made" radius={[4, 4, 0, 0]} />
            <Bar dataKey="invites" fill="#f59e0b" name="Invites sent" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#0d9488", borderRadius: 2, display: "inline-block" }} /> Connections made</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#f59e0b", borderRadius: 2, display: "inline-block" }} /> Invites sent</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", color: "#475569", fontSize: 11, marginTop: 24, paddingTop: 12, borderTop: "1px solid #1f2937" }}>
        MindVista HRMS · LinkedIn Monthly Report · {month} · Confidential
      </div>
    </div>
  );
}
