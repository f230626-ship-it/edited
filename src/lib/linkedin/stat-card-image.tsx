/**
 * Stat card JSX template rendered by `satori` (server-side, no browser).
 * Returns plain JSX — no React hooks, no client code.
 * Colors match KPI_DEFS in linkedin-stats-dashboard.tsx exactly.
 */

export interface StatCardStats {
  invitesSent: number;
  connectionsMade: number;
  acceptanceRate: number;
  messagesSent: number;
  followUpsSent: number;
  repliesReceived: number;
  replyRate: number;
}

export interface StatCardProps {
  profileName: string;
  stats: StatCardStats;
  month: string;
}

function KpiBox({
  label,
  value,
  color,
  suffix = "",
}: {
  label: string;
  value: number;
  color: string;
  suffix?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${color}33`,
        borderRadius: 10,
        padding: "14px 18px",
        width: 200,
        minWidth: 200,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "#94a3b8", marginBottom: 6, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>
        {typeof value === "number" && !Number.isInteger(value)
          ? value.toFixed(1)
          : value}
        {suffix}
      </div>
    </div>
  );
}

/** Returns a JSX element representing the stat card (800×480px). */
export function StatCardTemplate({ profileName, stats, month }: StatCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        width: 800,
        height: 480,
        padding: "36px 40px",
        fontFamily: "Inter, sans-serif",
        color: "#f8fafc",
        borderRadius: 16,
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>
          {profileName}
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          {month} · LinkedIn Outreach Stats
        </div>
      </div>

      {/* KPI Grid — row 1: 4 cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <KpiBox label="Invites Sent"    value={stats.invitesSent}    color="#f59e0b" />
        <KpiBox label="Connections"     value={stats.connectionsMade} color="#0d9488" />
        <KpiBox label="Acceptance Rate" value={stats.acceptanceRate} color="#10b981" suffix="%" />
        <KpiBox label="Messages Sent"   value={stats.messagesSent}   color="#8b5cf6" />
      </div>

      {/* KPI Grid — row 2: 3 cards */}
      <div style={{ display: "flex", gap: 12 }}>
        <KpiBox label="Follow-ups Sent"  value={stats.followUpsSent}    color="#d97706" />
        <KpiBox label="Replies Received" value={stats.repliesReceived}  color="#ec4899" />
        <KpiBox label="Reply Rate"       value={stats.replyRate}        color="#f43f5e" suffix="%" />
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 40,
          fontSize: 11,
          color: "#475569",
        }}
      >
        MindVista HRMS · Auto-generated report
      </div>
    </div>
  );
}
