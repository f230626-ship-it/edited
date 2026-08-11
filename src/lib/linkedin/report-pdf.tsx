/**
 * PDF report template using @react-pdf/renderer.
 * Renders a styled monthly LinkedIn outreach report with:
 *   - MindVista branding header
 *   - Combined KPI summary
 *   - Per-profile data table
 *   - Per-profile stat card PNG (embedded images)
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const C = {
  bg: "#0f172a",
  surface: "#1e293b",
  border: "#334155",
  amber: "#f59e0b",
  teal: "#0d9488",
  emerald: "#10b981",
  violet: "#8b5cf6",
  orange: "#d97706",
  pink: "#ec4899",
  rose: "#f43f5e",
  muted: "#94a3b8",
  white: "#f8fafc",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    padding: 40,
    fontFamily: "Helvetica",
    color: C.white,
  },
  // Header
  header: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  logo: { fontSize: 20, fontWeight: 700, color: C.amber },
  headerRight: { marginLeft: "auto", fontSize: 10, color: C.muted },
  // Section
  sectionTitle: { fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 10, marginTop: 20 },
  divider: { borderBottom: `1px solid ${C.border}`, marginBottom: 16 },
  // KPI grid
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: "12 14",
    border: `1px solid ${C.border}`,
  },
  kpiLabel: { fontSize: 8, color: C.muted, marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: 700 },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: C.surface, borderRadius: 6, padding: "8 10", marginBottom: 4 },
  tableRow: { flexDirection: "row", padding: "8 10", borderBottom: `1px solid ${C.border}` },
  tableCell: { flex: 1, fontSize: 9, color: C.white },
  tableHeaderCell: { flex: 1, fontSize: 8, fontWeight: 700, color: C.muted },
  // Stat card image
  statCardPage: { backgroundColor: C.bg, padding: 40, fontFamily: "Helvetica", color: C.white },
  statCardImage: { width: "100%", objectFit: "contain" },
  statCardLabel: { fontSize: 10, color: C.muted, marginBottom: 8, marginTop: 8 },
  // Footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row" },
  footerText: { fontSize: 8, color: C.muted },
});

export interface ProfileReportData {
  profileId: string;
  profileName: string;
  invitesSent: number;
  connectionsMade: number;
  acceptanceRate: number;
  messagesSent: number;
  followUpsSent: number;
  repliesReceived: number;
  replyRate: number;
  /** base64-encoded PNG stat card for this profile */
  statCardBase64: string | null;
}

interface ReportPdfProps {
  month: string;             // e.g. "July 2025"
  generatedAt: string;       // ISO timestamp
  profiles: ProfileReportData[];
  totals: {
    invitesSent: number;
    connectionsMade: number;
    acceptanceRate: number;
    messagesSent: number;
    followUpsSent: number;
    repliesReceived: number;
    replyRate: number;
  };
  allProfilesScreenshot?: string | null;
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

export function ReportPdf({ month, generatedAt, profiles, totals, allProfilesScreenshot }: ReportPdfProps) {
  const fmt = (n: number, decimals = 0) =>
    decimals > 0 ? n.toFixed(decimals) : String(n);

  return (
    <Document title={`LinkedIn Report — ${month}`} author="MindVista HRMS">
      {/* ─── Page 1: Cover + Combined Summary ─── */}
      <Page size="A4" style={styles.page}>
        {/* Branding Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>MindVista HRMS</Text>
          <Text style={styles.headerRight}>LinkedIn Monthly Report · {month}</Text>
        </View>
        <View style={styles.divider} />

        {/* Month Title */}
        <Text style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 4 }}>
          LinkedIn Outreach Report
        </Text>
        <Text style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
          {month} — {profiles.length} profile{profiles.length !== 1 ? "s" : ""} · Auto-generated
        </Text>

        {/* Combined KPI Cards */}
        <Text style={styles.sectionTitle}>Combined Performance</Text>
        <View style={styles.kpiRow}>
          <KpiBox label="Invites Sent"    value={fmt(totals.invitesSent)}    color={C.amber} />
          <KpiBox label="Connections"     value={fmt(totals.connectionsMade)} color={C.teal} />
          <KpiBox label="Acceptance Rate" value={`${fmt(totals.acceptanceRate, 1)}%`} color={C.emerald} />
          <KpiBox label="Messages Sent"   value={fmt(totals.messagesSent)}   color={C.violet} />
        </View>
        <View style={styles.kpiRow}>
          <KpiBox label="Follow-ups"       value={fmt(totals.followUpsSent)}    color={C.orange} />
          <KpiBox label="Replies Received" value={fmt(totals.repliesReceived)}  color={C.pink} />
          <KpiBox label="Reply Rate"       value={`${fmt(totals.replyRate, 1)}%`} color={C.rose} />
          <View style={{ flex: 1 }} />
        </View>

        {/* Per-profile Table */}
        <Text style={styles.sectionTitle}>Per-Profile Breakdown</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>PROFILE</Text>
          <Text style={styles.tableHeaderCell}>INVITES</Text>
          <Text style={styles.tableHeaderCell}>CONNS</Text>
          <Text style={styles.tableHeaderCell}>ACC%</Text>
          <Text style={styles.tableHeaderCell}>MSGS</Text>
          <Text style={styles.tableHeaderCell}>REPLIES</Text>
          <Text style={styles.tableHeaderCell}>REPLY%</Text>
        </View>
        {profiles.map((p) => (
          <View style={styles.tableRow} key={p.profileId}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{p.profileName}</Text>
            <Text style={styles.tableCell}>{p.invitesSent}</Text>
            <Text style={styles.tableCell}>{p.connectionsMade}</Text>
            <Text style={styles.tableCell}>{fmt(p.acceptanceRate, 1)}%</Text>
            <Text style={styles.tableCell}>{p.messagesSent}</Text>
            <Text style={styles.tableCell}>{p.repliesReceived}</Text>
            <Text style={styles.tableCell}>{fmt(p.replyRate, 1)}%</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated: {new Date(generatedAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} PKT
          </Text>
          <Text style={[styles.footerText, { marginLeft: "auto" }]}>
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""} · Confidential
          </Text>
        </View>
      </Page>

      {/* ─── All-profiles dashboard screenshot page ─── */}
      {allProfilesScreenshot && (
        <Page size="A4" style={{ backgroundColor: C.bg, padding: 20 }} key="all-profiles-card">
          <Text style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>All Profiles — Dashboard Snapshot · {month}</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            style={styles.statCardImage}
            src={`data:image/png;base64,${allProfilesScreenshot}`}
          />
        </Page>
      )}

      {/* ─── Per-profile: individual dashboard screenshot pages ─── */}
      {profiles
        .filter((p) => p.statCardBase64)
        .map((p) => (
          <Page size="A4" style={{ backgroundColor: C.bg, padding: 20 }} key={`card-${p.profileId}`}>
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{p.profileName} — Dashboard Snapshot</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image
              style={styles.statCardImage}
              src={`data:image/png;base64,${p.statCardBase64}`}
            />
          </Page>
        ))}
    </Document>
  );
}
