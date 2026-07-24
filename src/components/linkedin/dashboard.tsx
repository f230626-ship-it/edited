"use client";

import { Users, Briefcase, Award, Target, TrendingUp, GraduationCap, Lightbulb, Calendar } from "lucide-react";
import { ExecutiveSummary } from "./executive-summary";
import { CareerTimeline } from "./career-timeline";
import { SkillsIntelligence } from "./skills-intelligence";
import { EndorsementsAnalytics } from "./endorsements-analytics";
import { ProjectsOverview } from "./projects-overview";
import { NetworkAnalytics } from "./network-analytics";
import { LearningProgress } from "./learning-progress";
import { AIRecommendations } from "./ai-recommendations";

interface LinkedInDashboardProps {
  analytics: any; // From getLinkedInAnalytics()
}

export function LinkedInDashboard({ analytics }: LinkedInDashboardProps) {
  const {
    import: importData,
    profile,
    positions,
    skills,
    endorsements,
    projects,
    education,
    certifications,
    invitations,
    companyFollows,
    learning,
    events,
    jobApplications,
    richMedia,
  } = analytics;

  // Generate AI recommendations
  const recommendations = generateRecommendations(analytics);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <ExecutiveSummary summary={importData.summary} profile={profile} />

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <AIRecommendations recommendations={recommendations} />
      )}

      {/* Career Timeline */}
      {positions && positions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Career Journey</h2>
          </div>
          <CareerTimeline positions={positions} />
        </section>
      )}

      {/* Skills Intelligence */}
      {skills && skills.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Skills Intelligence</h2>
          </div>
          <SkillsIntelligence skills={skills} endorsements={endorsements || []} />
        </section>
      )}

      {/* Endorsements Analytics */}
      {endorsements && endorsements.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Endorsements</h2>
          </div>
          <EndorsementsAnalytics endorsements={endorsements} />
        </section>
      )}

      {/* Projects Overview */}
      {projects && projects.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Projects Portfolio</h2>
          </div>
          <ProjectsOverview projects={projects} />
        </section>
      )}

      {/* Network Analytics */}
      {invitations && invitations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Network Growth</h2>
          </div>
          <NetworkAnalytics invitations={invitations} />
        </section>
      )}

      {/* Learning & Development */}
      {(learning && learning.length > 0) || (certifications && certifications.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Learning & Development</h2>
          </div>
          <LearningProgress
            learning={learning || []}
            certifications={certifications || []}
            education={education || []}
          />
        </section>
      )}
    </div>
  );
}

// ============================================================================
// AI Recommendations Generator
// ============================================================================

function generateRecommendations(analytics: any): string[] {
  const recommendations: string[] = [];
  const { positions, skills, endorsements, certifications, learning, projects } = analytics;

  // Career progression
  if (positions && positions.length > 0) {
    const currentPos = positions.find((p: any) => p.is_current);
    if (!currentPos) {
      recommendations.push("Consider updating your current position on LinkedIn");
    }

    const yearsInCurrent = currentPos ? calculateTenure(currentPos.started_on) : 0;
    if (yearsInCurrent > 3) {
      recommendations.push("You've been in your current role for over 3 years - consider exploring new opportunities or seeking a promotion");
    }
  }

  // Skills & Endorsements
  if (skills && endorsements) {
    const skillsWithoutEndorsements = skills.length - new Set(endorsements.map((e: any) => e.skill_name)).size;
    if (skillsWithoutEndorsements > 5) {
      recommendations.push(`${skillsWithoutEndorsements} skills have no endorsements - consider asking colleagues to endorse you`);
    }

    const technicalSkills = skills.filter((s: any) => 
      /programming|software|code|development|tech|data|cloud|ai|machine learning/i.test(s.skill_name)
    ).length;
    const businessSkills = skills.filter((s: any) =>
      /management|leadership|strategy|communication|business|marketing|sales/i.test(s.skill_name)
    ).length;

    if (technicalSkills > businessSkills * 3) {
      recommendations.push("Consider adding more business and leadership skills to complement your technical expertise");
    }
  }

  // Certifications
  if (certifications && certifications.length > 0) {
    const recentCerts = certifications.filter((c: any) => {
      const date = new Date(c.started_on || c.finished_on);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return date > twoYearsAgo;
    });

    if (recentCerts.length === 0) {
      recommendations.push("No certifications added in the last 2 years - consider pursuing professional development");
    }
  } else {
    recommendations.push("Add professional certifications to strengthen your profile credibility");
  }

  // Learning
  if (learning && learning.length > 0) {
    recommendations.push(`Great job! You've completed ${learning.length} learning courses. Keep up the continuous learning`);
  } else {
    recommendations.push("Explore LinkedIn Learning to acquire new skills and stay competitive");
  }

  // Projects
  if (!projects || projects.length === 0) {
    recommendations.push("Showcase your work by adding projects to your profile");
  } else {
    const activeProjects = projects.filter((p: any) => p.is_current);
    if (activeProjects.length === 0) {
      recommendations.push("Consider adding current projects you're working on");
    }
  }

  return recommendations.slice(0, 6); // Return top 6 recommendations
}

function calculateTenure(startDate: string | null): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  return (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
}
