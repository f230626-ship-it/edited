/**
 * Employee performance PDF (client or server via @react-pdf/renderer).
 * Uses Helvetica so it works in the browser without custom font buffers.
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  header: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 12,
  },
  company: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  subtitle: { fontSize: 11, color: "#64748b", marginTop: 4 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: "#334155",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#64748b" },
  value: { fontFamily: "Helvetica-Bold" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpi: {
    width: "48%",
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    marginBottom: 6,
  },
  kpiLabel: { fontSize: 9, color: "#64748b", marginBottom: 4 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  note: {
    marginBottom: 6,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
  },
});

export type EmployeePerformanceReportData = {
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  email: string;
  managerName: string;
  dateRange: string;
  overallScore: number;
  standupScore: number;
  taskCompletion: number;
  consistency: number;
  grade: string;
  gradeLabel: string;
  standupsThisMonth: number;
  expectedStandups: number;
  recentStandups: { date: string; summary: string; score: number }[];
  managerFeedback: {
    text: string;
    weaknesses: string | null;
    improvementAreas: string | null;
    rating: number;
    reviewPeriod: string;
    date: string;
  } | null;
};

export function EmployeePerformanceReportDoc({
  data,
}: {
  data: EmployeePerformanceReportData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>MindVista HRMS</Text>
          <Text style={styles.subtitle}>Employee Performance Report — {data.dateRange}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee</Text>
          <View style={styles.row}>
            <Text>
              <Text style={styles.label}>Name: </Text>
              <Text style={styles.value}>{data.employeeName}</Text>
            </Text>
            <Text>
              <Text style={styles.label}>ID: </Text>
              <Text style={styles.value}>{data.employeeCode}</Text>
            </Text>
          </View>
          <View style={styles.row}>
            <Text>
              <Text style={styles.label}>Role: </Text>
              {data.designation} · {data.department}
            </Text>
            <Text>
              <Text style={styles.label}>Manager: </Text>
              {data.managerName}
            </Text>
          </View>
          <Text>
            <Text style={styles.label}>Email: </Text>
            {data.email}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scores</Text>
          <View style={styles.kpiGrid}>
            {[
              { label: "Overall", value: `${data.overallScore}%` },
              { label: "Stand-up", value: `${data.standupScore}%` },
              { label: "Task completion", value: `${data.taskCompletion}%` },
              { label: "Consistency", value: `${data.consistency}%` },
              { label: "Grade", value: `${data.grade} (${data.gradeLabel})` },
              {
                label: "Stand-ups (MTD)",
                value: `${data.standupsThisMonth} / ${data.expectedStandups}`,
              },
            ].map((kpi) => (
              <View key={kpi.label} style={styles.kpi}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={styles.kpiValue}>{kpi.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {data.recentStandups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent stand-ups</Text>
            {data.recentStandups.slice(0, 5).map((note, i) => (
              <View key={`${note.date}-${i}`} style={styles.note}>
                <View style={styles.row}>
                  <Text style={styles.value}>{note.summary}</Text>
                  <Text>
                    {note.score}% · {note.date}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {data.managerFeedback && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Manager feedback ({data.managerFeedback.reviewPeriod})
            </Text>
            <Text style={{ marginBottom: 4 }}>
              Rating: {data.managerFeedback.rating}/5 · {data.managerFeedback.date}
            </Text>
            <Text style={{ marginBottom: 4 }}>Strengths: {data.managerFeedback.text}</Text>
            {data.managerFeedback.weaknesses && (
              <Text style={{ marginBottom: 4 }}>
                Areas for improvement: {data.managerFeedback.weaknesses}
              </Text>
            )}
            {data.managerFeedback.improvementAreas && (
              <Text>Action items: {data.managerFeedback.improvementAreas}</Text>
            )}
          </View>
        )}

        <Text style={styles.footer}>
          MindVista HRMS · Confidential · Generated {new Date().toLocaleDateString("en-US")}
        </Text>
      </Page>
    </Document>
  );
}
