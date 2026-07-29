"use client";

import { ExecutiveSummary } from "./executive-summary";
import { CareerTimeline } from "./career-timeline";
import { SkillsIntelligence } from "./skills-intelligence";
import { EndorsementsAnalytics } from "./endorsements-analytics";
import { ProjectsOverview } from "./projects-overview";
import { NetworkAnalytics } from "./network-analytics";
import { LearningProgress } from "./learning-progress";
import { AIRecommendations } from "./ai-recommendations";
import { LinkedInUploadButton } from "./upload-button";
import { LinkedInSubnav } from "./linkedin-subnav";
import { format } from "date-fns";
import { Upload, Calendar, FileText } from "lucide-react";
import type {
  LinkedInCertification,
  LinkedInCompanyFollow,
  LinkedInEducation,
  LinkedInEvent,
  LinkedInImport,
  LinkedInJobApplication,
  LinkedInLearning,
  LinkedInPosition,
  LinkedInProfile,
  LinkedInProject,
  LinkedInRichMedia,
  LinkedInSkill,
  LinkedInEndorsement,
  LinkedInInvitation,
  LinkedInSummary,
} from "@/types/linkedin";

export interface IntelligenceDashboardProps {
  employeeId: string;
  data: {
    import: LinkedInImport;
    profile: LinkedInProfile | null;
    positions: LinkedInPosition[];
    skills: LinkedInSkill[];
    endorsements: LinkedInEndorsement[];
    projects: LinkedInProject[];
    education: LinkedInEducation[];
    certifications: LinkedInCertification[];
    invitations: LinkedInInvitation[];
    companyFollows: LinkedInCompanyFollow[];
    learning: LinkedInLearning[];
    events: LinkedInEvent[];
    jobApplications: LinkedInJobApplication[];
    richMedia: LinkedInRichMedia[];
    recommendations: string[];
  } | null;
}

function EmptyState({ employeeId }: { employeeId: string }) {
  return (
    <div className="space-y-6">
      <LinkedInSubnav />
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-12 text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <Upload className="h-7 w-7 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">No Profile Data Yet</h3>
          <p className="max-w-md mx-auto text-sm text-slate-400 leading-relaxed">
            Upload a LinkedIn Data Export ZIP to unlock profile intelligence — career timeline, skills,
            endorsements, learning history, and AI recommendations.
          </p>
        </div>
        <LinkedInUploadButton employeeId={employeeId} />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  hidden,
}: {
  title: string;
  children: React.ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-amber-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function IntelligenceDashboard({ employeeId, data }: IntelligenceDashboardProps) {
  if (!data) {
    return <EmptyState employeeId={employeeId} />;
  }

  const summary: LinkedInSummary = data.import.summary ?? {};
  const importLabel = data.import.completed_at
    ? format(new Date(data.import.completed_at), "MMM d, yyyy 'at' h:mm a")
    : format(new Date(data.import.created_at), "MMM d, yyyy");

  const sectionCount = [
    data.positions.length > 0,
    data.skills.length > 0 || data.endorsements.length > 0,
    data.projects.length > 0,
    data.invitations.length > 0,
    data.learning.length > 0 || data.certifications.length > 0 || data.education.length > 0,
    data.companyFollows.length > 0,
    data.jobApplications.length > 0,
    data.events.length > 0,
    data.richMedia.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 pb-10">
      <LinkedInSubnav />

      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
        <div className="space-y-1">
          <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-amber-400/80">
            Profile Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-[2.125rem] font-extrabold tracking-tight text-white leading-tight">
            Profile Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Career timeline, skills, endorsements, and AI-powered recommendations
          </p>
        </div>
        <div className="flex items-start gap-4 shrink-0 self-start md:pt-1">
          <LinkedInUploadButton employeeId={employeeId} />
          <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] px-5 py-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-medium">
              <FileText className="h-3.5 w-3.5" />
              Latest Import
            </div>
            <p className="text-sm font-mono font-semibold text-white">
              {data.import.filename}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Calendar className="h-3 w-3" />
              {importLabel}
            </div>
          </div>
        </div>
      </header>

      {data.recommendations.length > 0 && (
        <AIRecommendations recommendations={data.recommendations} />
      )}

      <ExecutiveSummary summary={summary} profile={data.profile} />

      <Section title="Career Timeline" hidden={data.positions.length === 0}>
        <CareerTimeline positions={data.positions} />
      </Section>

      <Section
        title="Skills & Endorsements"
        hidden={data.skills.length === 0 && data.endorsements.length === 0}
      >
        <div className="space-y-4">
          {data.skills.length > 0 && data.endorsements.length > 0 && (
            <SkillsIntelligence skills={data.skills} endorsements={data.endorsements} />
          )}
          {data.endorsements.length > 0 && (
            <EndorsementsAnalytics endorsements={data.endorsements} />
          )}
        </div>
      </Section>

      <Section title="Projects" hidden={data.projects.length === 0}>
        <ProjectsOverview projects={data.projects} />
      </Section>

      <Section title="Network Activity" hidden={data.invitations.length === 0}>
        <NetworkAnalytics invitations={data.invitations} />
      </Section>

      <Section
        title="Learning & Credentials"
        hidden={
          data.learning.length === 0 &&
          data.certifications.length === 0 &&
          data.education.length === 0
        }
      >
        <LearningProgress
          learning={data.learning}
          certifications={data.certifications}
          education={data.education}
        />
        {data.certifications.length > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight">Certifications</h3>
            <div className="space-y-0 divide-y divide-white/[0.04]">
              {data.certifications.slice(0, 8).map((cert) => (
                <div key={cert.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-white">{cert.name}</p>
                    {cert.authority && (
                      <p className="text-xs text-slate-400">{cert.authority}</p>
                    )}
                  </div>
                  {cert.started_on && (
                    <span className="shrink-0 text-xs font-mono text-slate-500">{cert.started_on}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Company Follows" hidden={data.companyFollows.length === 0}>
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 space-y-4">
          <p className="text-3xl font-extrabold text-amber-400">{data.companyFollows.length}</p>
          <p className="text-xs font-bold tracking-[0.15em] text-slate-400 uppercase">Companies Followed</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.companyFollows.slice(0, 12).map((company) => (
              <div key={company.id} className="flex items-center gap-2 text-sm text-slate-300 rounded-lg bg-white/[0.03] px-3 py-2 border border-white/[0.04]">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0" />
                {company.company_name}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Job Applications" hidden={data.jobApplications.length === 0}>
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {data.jobApplications.slice(0, 10).map((app) => (
              <div key={app.id} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-sm font-semibold text-white">{app.job_title ?? "Role"}</p>
                  <p className="text-xs text-slate-400">{app.company_name}</p>
                </div>
                {app.application_date && (
                  <span className="text-xs font-mono text-slate-500">{app.application_date}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Events" hidden={data.events.length === 0}>
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 space-y-3">
          {data.events.slice(0, 8).map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-white">{event.event_name}</span>
              {event.event_date && (
                <span className="shrink-0 text-xs font-mono text-slate-500">{event.event_date}</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rich Media" hidden={data.richMedia.length === 0}>
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 space-y-2">
          <p className="text-3xl font-extrabold text-cyan-400">{data.richMedia.length}</p>
          <p className="text-xs font-bold tracking-[0.15em] text-slate-400 uppercase">Media Items in Export</p>
        </div>
      </Section>
    </div>
  );
}
