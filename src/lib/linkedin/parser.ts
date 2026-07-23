// ============================================================================
// LinkedIn Intelligence Module - Intelligent CSV Parser
// ============================================================================
// This parser automatically detects and parses different LinkedIn CSV exports

import type { CSVDataset, LinkedInDatasetType, LinkedInSummary } from '@/types/linkedin';

// ============================================================================
// Dataset Type Detection
// ============================================================================

const DATASET_PATTERNS: Record<LinkedInDatasetType, RegExp[]> = {
  profile: [/^profile\.csv$/i, /^Profile\.csv$/],
  positions: [/^positions\.csv$/i, /^Positions\.csv$/],
  skills: [/^skills\.csv$/i, /^Skills\.csv$/],
  endorsements: [
    /^endorsement.*\.csv$/i,
    /^Endorsement_Received_Info\.csv$/,
    /^endorsements.*\.csv$/i,
  ],
  projects: [/^projects\.csv$/i, /^Projects\.csv$/],
  education: [/^education\.csv$/i, /^Education\.csv$/],
  certifications: [/^certifications\.csv$/i, /^Certifications\.csv$/],
  invitations: [/^invitations\.csv$/i, /^Invitations\.csv$/],
  company_follows: [
    /^company.*follows?\.csv$/i,
    /^Company Follows\.csv$/,
    /^following.*companies\.csv$/i,
  ],
  learning: [/^learning\.csv$/i, /^Learning\.csv$/],
  events: [/^events\.csv$/i, /^Events\.csv$/],
  job_applications: [
    /^job.*applications?\.csv$/i,
    /^Job Applications\.csv$/,
  ],
  rich_media: [/^rich.*media\.csv$/i, /^Rich_Media\.csv$/],
  unknown: [],
};

/**
 * Detect dataset type from filename
 */
export function detectDatasetType(filename: string): LinkedInDatasetType {
  const normalizedFilename = filename.trim();

  for (const [type, patterns] of Object.entries(DATASET_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedFilename)) {
        return type as LinkedInDatasetType;
      }
    }
  }

  return 'unknown';
}

// ============================================================================
// CSV Parsing Utilities
// ============================================================================

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvContent: string): Record<string, any>[] {
  const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);
  
  if (lines.length === 0) {
    return [];
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data: Record<string, any>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length === headers.length) {
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }
  }

  return data;
}

/**
 * Parse a single CSV line handling quotes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

// ============================================================================
// Data Normalization
// ============================================================================

/**
 * Normalize date strings from LinkedIn export
 */
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  // LinkedIn date formats:
  // "YYYY-MM-DD"
  // "MM/DD/YYYY"
  // "Month YYYY"
  // "YYYY"

  const str = dateStr.trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // MM/DD/YYYY
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Month YYYY (e.g., "January 2020")
  const monthYearMatch = str.match(/^(\w+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, monthName, year] = monthYearMatch;
    const month = getMonthNumber(monthName);
    if (month) {
      return `${year}-${month}-01`;
    }
  }

  // Just year
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }

  return null;
}

function getMonthNumber(monthName: string): string | null {
  const months: Record<string, string> = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
  };

  return months[monthName.toLowerCase()] || null;
}

/**
 * Normalize boolean values
 */
export function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1';
  }
  return false;
}

// ============================================================================
// Dataset Parsers
// ============================================================================

/**
 * Parse Profile CSV
 */
export function parseProfileData(data: Record<string, any>[]): any | null {
  if (data.length === 0) return null;

  const row = data[0]; // Profile CSV typically has one row

  return {
    first_name: row['First Name'] || row['firstName'] || null,
    last_name: row['Last Name'] || row['lastName'] || null,
    maiden_name: row['Maiden Name'] || row['maidenName'] || null,
    headline: row['Headline'] || row['headline'] || null,
    summary: row['Summary'] || row['summary'] || null,
    industry: row['Industry'] || row['industry'] || null,
    location: row['Location'] || row['location'] || null,
    country: row['Country'] || row['country'] || null,
    zip_code: row['Zip Code'] || row['zipCode'] || null,
    geo_location: row['Geo Location'] || row['geoLocation'] || null,
    birth_date: normalizeDate(row['Birth Date'] || row['birthDate']),
    websites: parseArray(row['Websites'] || row['websites']),
    twitter_handles: parseArray(row['Twitter Handles'] || row['twitterHandles']),
  };
}

/**
 * Parse Positions CSV
 */
export function parsePositionsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    company_name: row['Company Name'] || row['companyName'] || 'Unknown Company',
    title: row['Title'] || row['title'] || 'Unknown Title',
    description: row['Description'] || row['description'] || null,
    location: row['Location'] || row['location'] || null,
    started_on: normalizeDate(row['Started On'] || row['startedOn']),
    finished_on: normalizeDate(row['Finished On'] || row['finishedOn']),
    is_current: !row['Finished On'] && !row['finishedOn'],
  }));
}

/**
 * Parse Skills CSV
 */
export function parseSkillsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    skill_name: row['Name'] || row['name'] || row['Skill'] || row['skill'] || 'Unknown Skill',
  }));
}

/**
 * Parse Endorsements CSV
 */
export function parseEndorsementsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    skill_name: row['Skill Name'] || row['skillName'] || row['Skill'] || 'Unknown Skill',
    endorser_first_name: row['Endorser First Name'] || row['endorserFirstName'] || null,
    endorser_last_name: row['Endorser Last Name'] || row['endorserLastName'] || null,
    endorsement_date: normalizeDate(row['Endorsement Date'] || row['endorsementDate'] || row['Date']),
    status: row['Status'] || row['status'] || null,
  }));
}

/**
 * Parse Projects CSV
 */
export function parseProjectsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    title: row['Title'] || row['title'] || row['Project Name'] || 'Unknown Project',
    description: row['Description'] || row['description'] || null,
    url: row['Url'] || row['url'] || row['URL'] || null,
    started_on: normalizeDate(row['Started On'] || row['startedOn'] || row['Start Date']),
    finished_on: normalizeDate(row['Finished On'] || row['finishedOn'] || row['End Date']),
    is_current: !row['Finished On'] && !row['finishedOn'] && !row['End Date'],
  }));
}

/**
 * Parse Education CSV
 */
export function parseEducationData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    school_name: row['School Name'] || row['schoolName'] || row['School'] || 'Unknown School',
    degree_name: row['Degree Name'] || row['degreeName'] || row['Degree'] || null,
    field_of_study: row['Field Of Study'] || row['fieldOfStudy'] || row['Major'] || null,
    notes: row['Notes'] || row['notes'] || null,
    activities: row['Activities'] || row['activities'] || null,
    started_on: normalizeDate(row['Start Date'] || row['startDate'] || row['Started On']),
    finished_on: normalizeDate(row['End Date'] || row['endDate'] || row['Finished On']),
  }));
}

/**
 * Parse Certifications CSV
 */
export function parseCertificationsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    name: row['Name'] || row['name'] || row['Certification'] || 'Unknown Certification',
    authority: row['Authority'] || row['authority'] || row['Issuer'] || null,
    license_number: row['License Number'] || row['licenseNumber'] || null,
    url: row['Url'] || row['url'] || row['URL'] || null,
    started_on: normalizeDate(row['Started On'] || row['startedOn'] || row['Issue Date']),
    finished_on: normalizeDate(row['Finished On'] || row['finishedOn'] || row['Expiration Date']),
  }));
}

/**
 * Parse Invitations CSV
 */
export function parseInvitationsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    direction: (row['Direction'] || row['direction'] || 'OUTGOING').toUpperCase() as 'INCOMING' | 'OUTGOING',
    first_name: row['First Name'] || row['firstName'] || null,
    last_name: row['Last Name'] || row['lastName'] || null,
    invitation_date: normalizeDate(row['Sent At'] || row['sentAt'] || row['Date']),
    message: row['Message'] || row['message'] || null,
  }));
}

/**
 * Parse Company Follows CSV
 */
export function parseCompanyFollowsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    company_name: row['Company Name'] || row['companyName'] || row['Organization Name'] || 'Unknown Company',
    followed_at: normalizeDate(row['Followed At'] || row['followedAt'] || row['Date']),
  }));
}

/**
 * Parse Learning CSV
 */
export function parseLearningData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    course_title: row['Course Title'] || row['courseTitle'] || row['Title'] || 'Unknown Course',
    course_url: row['Course Url'] || row['courseUrl'] || row['URL'] || null,
    completion_date: normalizeDate(row['Completion Date'] || row['completionDate'] || row['Completed On']),
    time_spent: row['Time Spent'] || row['timeSpent'] || row['Duration'] || null,
  }));
}

/**
 * Parse Events CSV
 */
export function parseEventsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    event_name: row['Event Name'] || row['eventName'] || row['Name'] || 'Unknown Event',
    event_type: row['Event Type'] || row['eventType'] || row['Type'] || null,
    event_date: normalizeDate(row['Event Date'] || row['eventDate'] || row['Date']),
  }));
}

/**
 * Parse Job Applications CSV
 */
export function parseJobApplicationsData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    company_name: row['Company Name'] || row['companyName'] || row['Company'] || null,
    job_title: row['Job Title'] || row['jobTitle'] || row['Title'] || null,
    application_date: normalizeDate(row['Application Date'] || row['applicationDate'] || row['Applied On'] || row['Date']),
    status: row['Status'] || row['status'] || null,
  }));
}

/**
 * Parse Rich Media CSV
 */
export function parseRichMediaData(data: Record<string, any>[]): any[] {
  return data.map((row) => ({
    media_type: row['Media Type'] || row['mediaType'] || row['Type'] || null,
    title: row['Title'] || row['title'] || null,
    description: row['Description'] || row['description'] || null,
    url: row['Url'] || row['url'] || row['URL'] || null,
    created_date: normalizeDate(row['Created Date'] || row['createdDate'] || row['Date']),
  }));
}

// ============================================================================
// Utility Functions
// ============================================================================

function parseArray(value: string | null | undefined): string[] | null {
  if (!value) return null;
  
  // LinkedIn often separates values with semicolons or commas
  const separators = [';', ',', '|'];
  
  for (const sep of separators) {
    if (value.includes(sep)) {
      return value
        .split(sep)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }
  }
  
  // Single value
  return [value.trim()];
}

/**
 * Calculate years of experience from positions
 */
export function calculateYearsOfExperience(positions: any[]): number {
  if (positions.length === 0) return 0;

  let totalMonths = 0;

  positions.forEach((pos) => {
    const start = pos.started_on ? new Date(pos.started_on) : null;
    const end = pos.finished_on ? new Date(pos.finished_on) : new Date();

    if (start) {
      const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      totalMonths += months;
    }
  });

  return Math.round(totalMonths / 12);
}

/**
 * Get top skills by endorsement count
 */
export function getTopSkills(endorsements: any[], limit: number = 5): string[] {
  const skillCounts: Record<string, number> = {};

  endorsements.forEach((end) => {
    const skill = end.skill_name;
    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
  });

  return Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([skill]) => skill);
}
