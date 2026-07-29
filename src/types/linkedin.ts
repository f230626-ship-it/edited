// ============================================================================
// LinkedIn Intelligence Module - TypeScript Types
// ============================================================================

export type LinkedInImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface LinkedInImport {
  id: string;
  employee_id: string;
  uploaded_by: string;
  filename: string;
  file_size: number;
  status: LinkedInImportStatus;
  error_message?: string;
  datasets_detected: string[];
  parsing_progress: Record<string, number>;
  summary: LinkedInSummary;
  created_at: string;
  completed_at?: string;
}

export interface LinkedInSummary {
  total_positions?: number;
  total_skills?: number;
  total_endorsements?: number;
  total_projects?: number;
  total_certifications?: number;
  total_education?: number;
  total_invitations?: number;
  total_connections?: number;
  total_companies_followed?: number;
  total_learning_courses?: number;
  total_events?: number;
  total_job_applications?: number;
  total_rich_media?: number;
  years_of_experience?: number;
  current_company?: string;
  current_title?: string;
  top_skills?: string[];
  strongest_expertise?: string[];
}

export interface LinkedInProfile {
  id: string;
  import_id: string;
  employee_id: string;
  first_name?: string;
  last_name?: string;
  maiden_name?: string;
  headline?: string;
  summary?: string;
  industry?: string;
  location?: string;
  country?: string;
  zip_code?: string;
  geo_location?: string;
  birth_date?: string;
  websites?: string[];
  instant_messengers?: Record<string, string>;
  twitter_handles?: string[];
  created_at: string;
}

export interface LinkedInPosition {
  id: string;
  import_id: string;
  employee_id: string;
  company_name: string;
  title: string;
  description?: string;
  location?: string;
  started_on?: string;
  finished_on?: string;
  is_current: boolean;
  created_at: string;
}

export interface LinkedInSkill {
  id: string;
  import_id: string;
  employee_id: string;
  skill_name: string;
  created_at: string;
}

export interface LinkedInEndorsement {
  id: string;
  import_id: string;
  employee_id: string;
  skill_name: string;
  endorser_first_name?: string;
  endorser_last_name?: string;
  endorsement_date?: string;
  status?: string;
  created_at: string;
}

export interface LinkedInProject {
  id: string;
  import_id: string;
  employee_id: string;
  title: string;
  description?: string;
  url?: string;
  started_on?: string;
  finished_on?: string;
  is_current: boolean;
  created_at: string;
}

export interface LinkedInEducation {
  id: string;
  import_id: string;
  employee_id: string;
  school_name: string;
  degree_name?: string;
  field_of_study?: string;
  notes?: string;
  activities?: string;
  started_on?: string;
  finished_on?: string;
  created_at: string;
}

export interface LinkedInCertification {
  id: string;
  import_id: string;
  employee_id: string;
  name: string;
  authority?: string;
  license_number?: string;
  url?: string;
  started_on?: string;
  finished_on?: string;
  created_at: string;
}

export interface LinkedInInvitation {
  id: string;
  import_id: string;
  employee_id: string;
  direction: 'INCOMING' | 'OUTGOING';
  first_name?: string;
  last_name?: string;
  invitation_date?: string;
  message?: string;
  created_at: string;
}

export interface LinkedInCompanyFollow {
  id: string;
  import_id: string;
  employee_id: string;
  company_name: string;
  followed_at?: string;
  created_at: string;
}

export interface LinkedInLearning {
  id: string;
  import_id: string;
  employee_id: string;
  course_title: string;
  course_url?: string;
  completion_date?: string;
  time_spent?: string;
  created_at: string;
}

export interface LinkedInEvent {
  id: string;
  import_id: string;
  employee_id: string;
  event_name: string;
  event_type?: string;
  event_date?: string;
  created_at: string;
}

export interface LinkedInJobApplication {
  id: string;
  import_id: string;
  employee_id: string;
  company_name?: string;
  job_title?: string;
  application_date?: string;
  status?: string;
  created_at: string;
}

export interface LinkedInRichMedia {
  id: string;
  import_id: string;
  employee_id: string;
  media_type?: string;
  title?: string;
  description?: string;
  url?: string;
  created_date?: string;
  created_at: string;
}

// ============================================================================
// CSV Parser Types
// ============================================================================

export interface CSVDataset {
  filename: string;
  type: LinkedInDatasetType;
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
}

export type LinkedInDatasetType =
  | 'profile'
  | 'positions'
  | 'skills'
  | 'endorsements'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'invitations'
  | 'connections'
  | 'company_follows'
  | 'learning'
  | 'events'
  | 'job_applications'
  | 'rich_media'
  | 'unknown';

export interface ParsedLinkedInExport {
  datasets: CSVDataset[];
  summary: LinkedInSummary;
  recommendations: string[];
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface CareerTimelineItem {
  company: string;
  title: string;
  startDate?: Date;
  endDate?: Date;
  isCurrent: boolean;
  duration: string;
}

export interface SkillAnalytics {
  name: string;
  endorsementCount: number;
  category?: string;
}

export interface EndorsementTrend {
  date: string;
  count: number;
}

export interface InvitationAnalytics {
  month: string;
  incoming: number;
  outgoing: number;
}

export interface LinkedInInsights {
  careerSummary: {
    yearsOfExperience: number;
    currentCompany?: string;
    currentTitle?: string;
    previousCompanies: string[];
    totalPositions: number;
    averageTenure: number;
  };
  skillsIntelligence: {
    totalSkills: number;
    topSkills: SkillAnalytics[];
    technicalSkills: string[];
    businessSkills: string[];
  };
  endorsementStats: {
    totalEndorsements: number;
    mostEndorsedSkills: SkillAnalytics[];
    endorsementTrends: EndorsementTrend[];
  };
  projectsOverview: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
  };
  networkingActivity: {
    totalInvitations: number;
    acceptanceRate: number;
    monthlyTrends: InvitationAnalytics[];
  };
  learningProgress: {
    totalCourses: number;
    totalCertifications: number;
    recentActivity: string[];
  };
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadProgress {
  stage: 'uploading' | 'extracting' | 'parsing' | 'storing' | 'analyzing' | 'completed';
  progress: number; // 0-100
  message: string;
  currentDataset?: string;
}
