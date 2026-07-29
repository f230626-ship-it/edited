import type {
  LinkedInCertification,
  LinkedInEducation,
  LinkedInEndorsement,
  LinkedInJobApplication,
  LinkedInLearning,
  LinkedInPosition,
  LinkedInProject,
  LinkedInSkill,
  LinkedInSummary,
} from "@/types/linkedin";

interface RecommendationInput {
  summary: LinkedInSummary;
  positions: LinkedInPosition[];
  skills: LinkedInSkill[];
  endorsements: LinkedInEndorsement[];
  projects: LinkedInProject[];
  education: LinkedInEducation[];
  certifications: LinkedInCertification[];
  learning: LinkedInLearning[];
  jobApplications: LinkedInJobApplication[];
}

const TECH_KEYWORDS = [
  "javascript",
  "python",
  "java",
  "react",
  "node",
  "aws",
  "cloud",
  "sql",
  "machine learning",
  "ai",
  "data",
  "engineering",
  "software",
  "devops",
  "kubernetes",
];

const BUSINESS_KEYWORDS = [
  "sales",
  "marketing",
  "business",
  "management",
  "leadership",
  "strategy",
  "communication",
  "negotiation",
  "account",
  "partnership",
];

function yearsSince(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function matchesKeywords(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function generateRecommendations(input: RecommendationInput): string[] {
  const recommendations: string[] = [];
  const { summary, positions, skills, endorsements, certifications, learning, jobApplications } =
    input;

  const topSkills = summary.top_skills ?? [];
  if (topSkills.length > 0) {
    recommendations.push(
      `Your top endorsed skills are ${topSkills.slice(0, 3).join(", ")} — highlight these on your profile and in outreach messaging.`
    );
  }

  const skillNames = skills.map((s) => s.skill_name);
  const techCount = skillNames.filter((s) => matchesKeywords(s, TECH_KEYWORDS)).length;
  const businessCount = skillNames.filter((s) => matchesKeywords(s, BUSINESS_KEYWORDS)).length;

  if (techCount > 0 && businessCount === 0) {
    recommendations.push(
      "Your profile is heavily technical with few business-oriented skills — consider adding sales, leadership, or communication skills to strengthen BD positioning."
    );
  } else if (businessCount > 0 && techCount === 0) {
    recommendations.push(
      "Your skills lean toward business — adding technical or industry-specific skills can improve credibility with technical prospects."
    );
  }

  const latestCert = certifications
    .filter((c) => c.started_on)
    .sort((a, b) => (b.started_on ?? "").localeCompare(a.started_on ?? ""))[0];

  const certAge = yearsSince(latestCert?.started_on);
  if (certifications.length === 0) {
    recommendations.push(
      "No certifications on your profile — completing a relevant LinkedIn Learning course or industry certification can boost credibility."
    );
  } else if (certAge !== null && certAge >= 2) {
    recommendations.push(
      "No certifications added in the last 2 years — refreshing credentials signals ongoing professional development."
    );
  }

  if (learning.length === 0) {
    recommendations.push(
      "No LinkedIn Learning activity detected — completing courses in your target industry shows active growth."
    );
  }

  const currentPositions = positions.filter((p) => p.is_current);
  if (currentPositions.length > 1) {
    recommendations.push(
      "Multiple current positions listed — consolidating to one primary role improves profile clarity for prospects."
    );
  }

  if ((summary.total_projects ?? 0) > 0 && (summary.total_projects ?? 0) < 3) {
    recommendations.push(
      "Only a few projects listed — adding case studies or client outcomes strengthens your professional narrative."
    );
  }

  if (jobApplications.length >= 5) {
    const titles = jobApplications
      .map((j) => j.job_title)
      .filter(Boolean)
      .slice(0, 3);
    if (titles.length > 0) {
      recommendations.push(
        `You've applied to roles like "${titles[0]}" — ensure your headline and summary align with this career direction.`
      );
    }
  }

  const endorsedSkillCount = new Set(endorsements.map((e) => e.skill_name)).size;
  if (skills.length > 10 && endorsedSkillCount < skills.length * 0.3) {
    recommendations.push(
      "Many skills have few or no endorsements — focus on getting endorsements for your top 5–10 skills to increase profile authority."
    );
  }

  if ((summary.years_of_experience ?? 0) >= 5 && (summary.total_endorsements ?? 0) < 10) {
    recommendations.push(
      "With significant experience but limited endorsements — request endorsements from colleagues and clients to strengthen social proof."
    );
  }

  return recommendations.slice(0, 6);
}
