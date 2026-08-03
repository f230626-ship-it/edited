"use client";

import { OutreachControlRoom } from "./outreach-control-room";

export function LinkedInDashboard({ analytics, employeeId }: any) {
  // If analytics object is provided, wrap into OutreachControlRoom format
  const initialData = {
    reportingWindow: {
      startDate: "2026-01-01",
      endDate: "2026-07-27",
    },
    profiles: [
      { id: "fiza-s", name: "Fiza S.", isPartialData: true },
      { id: "usama-s", name: "M. Usama (Sam)", isPartialData: true },
      { id: "abdul-h", name: "Abdul Hafeez", isPartialData: false },
      { id: "abdullah-s", name: "Abdullah S.", isPartialData: false },
    ],
    selectedProfileId: "abdullah-s",
    compareProfileId: null,
    granularity: "quarterly" as const,
    kpis: {
      invitesSent: 4010,
      connectionsMade: 1234,
      acceptanceRate: 30.8,
      messagesSent: 8007,
      followUpsSent: 6690,
      repliesReceived: 1015,
      replyRate: 12.7,
    },
    compareKpis: null,
    chartData: [
      {
        period: "'26Q1",
        invitesSent: 1500,
        connectionsMade: 500,
        acceptanceRate: 33.3,
        messagesSent: 3600,
        initialMessages: 600,
        followUpsSent: 3000,
        repliesReceived: 560,
        replyRate: 15.6,
      },
      {
        period: "'26Q2",
        invitesSent: 1950,
        connectionsMade: 600,
        acceptanceRate: 30.8,
        messagesSent: 3450,
        initialMessages: 600,
        followUpsSent: 2850,
        repliesReceived: 390,
        replyRate: 11.3,
      },
      {
        period: "'26Q3",
        invitesSent: 560,
        connectionsMade: 134,
        acceptanceRate: 23.9,
        messagesSent: 957,
        initialMessages: 117,
        followUpsSent: 840,
        repliesReceived: 65,
        replyRate: 6.8,
      },
    ],
    compareChartData: [],
    isAdmin: true,
  };

  return <OutreachControlRoom initialData={initialData} employeeId={employeeId} />;
}

export { OutreachControlRoom };
