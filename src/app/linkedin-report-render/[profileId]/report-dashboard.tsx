"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
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

interface Data {
  profileName: string;
  month: string;
  invitesSent: number;
  connectionsMade: number;
  acceptanceRate: number;
  messagesSent: number;
  followUpsSent: number;
  repliesReceived: number;
  replyRate: number;
}

export function ReportDashboard({ data }: { data: Data }) {
  const fmt = (n: number, suffix = "") => (suffix ? `${n.toFixed(1)}${suffix}` : String(n));

  const invitesVsConns = [
    { name: "This Month", connections: data.connectionsMade, invites: data.invitesSent },
  ];
  const acceptanceData = [{ name: "Acceptance", rate: data.acceptanceRate }];
  const msgData = [
    { name: "This Month", initial: Math.max(0, data.messagesSent - data.followUpsSent), followups: data.followUpsSent, replies: data.repliesReceived },
  ];
  const replyData = [{ name: "Reply", replies: data.repliesReceived, rate: data.replyRate }];

  return (
    <div data-report="true" style={{ background: "#0a0e1a", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", padding: "30px 40px", width: 1400 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ padding: "8px 20px", borderRadius: 20, fontSize: 14, fontWeight: 600, background: "#f59e0b", color: "#0a0e1a" }}>
          {data.profileName}
        </div>
      </div>
      <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
        Showing: <strong>{data.profileName}</strong> · {data.month}
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {KPI_DEFS.map((kpi) => {
          const val = data[kpi.key];
          const display = kpi.suffix ? `${Number(val).toFixed(1)}${kpi.suffix}` : String(val);
          return (
            <div key={kpi.key} style={{ flex: 1, background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: kpi.color }}>{display}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>selected month</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>All profiles at a glance</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["PROFILE", "INVITES SENT", "CONNECTIONS", "ACCEPTANCE RATE", "MESSAGES SENT", "FOLLOW-UPS", "REPLIES", "REPLY RATE"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, textTransform: "uppercase", color: "#94a3b8", padding: "10px 14px", borderBottom: "1px solid #1f2937", background: "#111827" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}><strong>{data.profileName}</strong></td>
              <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{data.invitesSent}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{data.connectionsMade}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{data.acceptanceRate.toFixed(1)}%</td>
              <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{data.messagesSent}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{data.followUpsSent}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{data.repliesReceived}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #111827" }}>{data.replyRate.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Invites vs Connections */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Invites sent vs. connections made</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>Connections made ÷ invites sent</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={invitesVsConns} barGap={4}>
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

        {/* Acceptance Rate */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Acceptance rate</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>Connections made ÷ invites sent</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={acceptanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [`${v}%`, "Acceptance %"]} />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: "#10b981", stroke: "#0a0e1a", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: "#10b981", display: "inline-block" }} /> Acceptance %</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Messages: initial outreach vs. follow-ups</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>Outbound messages breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={msgData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              <Bar dataKey="followups" fill="#d97706" name="Follow-ups" radius={[4, 4, 0, 0]} />
              <Bar dataKey="initial" fill="#8b5cf6" name="Initial" radius={[4, 4, 0, 0]} />
              <Bar dataKey="replies" fill="#ec4899" name="Replies" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#d97706", borderRadius: 2, display: "inline-block" }} /> Follow-ups</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#8b5cf6", borderRadius: 2, display: "inline-block" }} /> Initial</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#ec4899", borderRadius: 2, display: "inline-block" }} /> Replies</span>
          </div>
        </div>

        {/* Reply Rate */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Replies received & reply rate</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>Replies ÷ messages sent</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={replyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              <Line type="monotone" dataKey="replies" stroke="#ec4899" strokeWidth={3} dot={{ r: 6, fill: "#ec4899", stroke: "#0a0e1a", strokeWidth: 2 }} name="Replies" />
              <Line type="monotone" dataKey="rate" stroke="#f43f5e" strokeWidth={3} dot={{ r: 6, fill: "#f43f5e", stroke: "#0a0e1a", strokeWidth: 2 }} name="Reply %" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: "#ec4899", display: "inline-block" }} /> Replies</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: "#f43f5e", display: "inline-block" }} /> Reply %</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", color: "#475569", fontSize: 11, marginTop: 24, paddingTop: 12, borderTop: "1px solid #1f2937" }}>
        MindVista HRMS · LinkedIn Monthly Report · {data.month} · Confidential
      </div>
    </div>
  );
}
