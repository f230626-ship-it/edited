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
  connections: [/^connections\.csv$/i, /^Connections\.csv$/],
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

  // Extract basename for subdirectory support (e.g., "Takeout/LinkedIn/Data/Profile.csv")
  const basename = normalizedFilename.replace(/^.*[/\\]/, '').trim();

  for (const [type, patterns] of Object.entries(DATASET_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedFilename) || pattern.test(basename)) {
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

  // Find header row: some LinkedIn exports (like Connections.csv) have "Notes:" rows at the top.
  let headerIndex = 0;
  const knownHeaders = [
    'first name', 'last name', 'email address', 'company', 'position', 'connected on',
    'company name', 'title', 'name', 'skill name', 'school name', 'degree name',
    'direction', 'from', 'to', 'sent at', 'course title', 'event name', 'media type'
  ];
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const parsed = parseCSVLine(lines[i]).map(h => h.toLowerCase().trim());
    const hasKnownHeader = parsed.some(h => knownHeaders.includes(h));
    
    if (hasKnownHeader) {
      headerIndex = i;
      break;
    }
  }

  // Parse header
  const headers = parseCSVLine(lines[headerIndex]);
  
  // Parse data rows
  const data: Record<string, any>[] = [];
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
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
// Flexible Column Picking
// ============================================================================

function pickColumn(row: Record<string, any>, candidates: string[]): any {
  const rowKeys = Object.keys(row);
  // First pass: exact match (case-insensitive)
  for (const candidate of candidates) {
    const match = rowKeys.find((k) => k.toLowerCase() === candidate.toLowerCase());
    if (match !== undefined) {
      const val = row[match];
      if (val !== null && val !== undefined && val !== '') return val;
    }
  }
  // Second pass: substring match (case-insensitive)
  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLowerCase().trim();
    const match = rowKeys.find((k) => {
      const lowerKey = k.toLowerCase().trim();
      return lowerKey.includes(lowerCandidate);
    });
    if (match !== undefined) {
      const val = row[match];
      if (val !== null && val !== undefined && val !== '') return val;
    }
  }
  return null;
}

// ============================================================================
// Data Normalization
// ============================================================================

/**
 * Normalize date strings from LinkedIn export
 */
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  const str = dateStr.trim();

  // YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // MM/DD/YYYY HH:MM (LinkedIn invitations "Sent At")
  const mdyTimeMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+\d{2}:\d{2}/);
  if (mdyTimeMatch) {
    const [, month, day, year] = mdyTimeMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YY, H:MM AM/PM (LinkedIn invitations "Sent At" with 2-digit year)
  const mdyShortTimeMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}),\s+\d{1,2}:\d{2}\s+(?:AM|PM|am|pm)$/);
  if (mdyShortTimeMatch) {
    const [, month, day, shortYear] = mdyShortTimeMatch;
    const yearNum = parseInt(shortYear, 10);
    const fullYear = yearNum >= 70 ? 1900 + yearNum : 2000 + yearNum;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YY
  const mdyShortMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdyShortMatch) {
    const [, month, day, shortYear] = mdyShortMatch;
    const yearNum = parseInt(shortYear, 10);
    const fullYear = yearNum >= 70 ? 1900 + yearNum : 2000 + yearNum;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD Mon YYYY (LinkedIn connections "Connected On": "22 Jul 2026")
  const dmyMatch = str.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (dmyMatch) {
    const [, day, monthName, year] = dmyMatch;
    const month = getMonthNumber(monthName);
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Mon DD, YYYY ("Jul 22, 2026")
  const mdCommaYMatch = str.match(/^(\w+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (mdCommaYMatch) {
    const [, monthName, day, year] = mdCommaYMatch;
    const month = getMonthNumber(monthName);
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
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
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
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
    first_name: pickColumn(row, ['First Name', 'first_name', 'FirstName', 'first', 'Given Name', 'First', 'Name']),
    last_name: pickColumn(row, ['Last Name', 'last_name', 'LastName', 'last', 'Family Name', 'Surname', 'Last']),
    maiden_name: pickColumn(row, ['Maiden Name', 'maiden_name', 'MaidenName', 'maiden']),
    headline: pickColumn(row, ['Headline', 'headline']),
    summary: pickColumn(row, ['Summary', 'summary']),
    industry: pickColumn(row, ['Industry', 'industry']),
    location: pickColumn(row, ['Location', 'location']),
    country: pickColumn(row, ['Country', 'country']),
    zip_code: pickColumn(row, ['Zip Code', 'zip_code', 'zipCode']),
    geo_location: pickColumn(row, ['Geo Location', 'geo_location', 'geoLocation']),
    birth_date: normalizeDate(pickColumn(row, ['Birth Date', 'birth_date', 'birthDate'])),
    websites: parseArray(pickColumn(row, ['Websites', 'websites']) || ''),
    twitter_handles: parseArray(pickColumn(row, ['Twitter Handles', 'twitter_handles', 'twitterHandles']) || ''),
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
  if (data.length > 0) {
    console.log("[parseInvitationsData] CSV headers:", Object.keys(data[0]));
    console.log("[parseInvitationsData] first row sample:", JSON.stringify(data[0]));
  }
  return data.map((row) => {
    const direction = (pickColumn(row, ['Direction', 'direction', 'dir', 'Dir', 'Invitation Direction'])?.toUpperCase() || 'OUTGOING') as 'INCOMING' | 'OUTGOING';

    // Extract target person's name based on direction
    // OUTGOING: target is in 'To' column, INCOMING: target is in 'From' column
    let first_name: string | null = null;
    let last_name: string | null = null;
    const fullName = pickColumn(row, direction === 'OUTGOING' ? ['To', 'to'] : ['From', 'from']);
    if (fullName && typeof fullName === 'string') {
      const trimmed = fullName.trim();
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx > 0) {
        first_name = trimmed.substring(0, spaceIdx).trim() || null;
        last_name = trimmed.substring(spaceIdx + 1).trim() || null;
      } else {
        first_name = trimmed || null;
      }
    }

    return {
      direction,
      first_name,
      last_name,
      invitation_date: normalizeDate(pickColumn(row, ['Sent At', 'Sent On', 'sentAt', 'sentOn', 'Date', 'date', 'Invitation Date', 'InvitationDate', 'Date Sent', 'Created On', 'Created', 'Sent', 'Invited On', 'Invitation Sent', 'Invitation Created'])),
      message: pickColumn(row, ['Message', 'message', 'Note', 'note', 'Notes', 'Custom Message', 'Invitation Note']),
    };
  });
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
 * Parse Connections CSV
 */
export function parseConnectionsData(data: Record<string, any>[]): any[] {
  if (data.length > 0) {
    console.log("[parseConnectionsData] CSV headers:", Object.keys(data[0]));
    console.log("[parseConnectionsData] first row sample:", JSON.stringify(data[0]));
  }
  return data.map((row) => ({
    first_name: pickColumn(row, ['First Name', 'first_name', 'FirstName', 'first', 'Given Name', 'First', 'Name']),
    last_name: pickColumn(row, ['Last Name', 'last_name', 'LastName', 'last', 'Family Name', 'Surname', 'Last']),
    email_address: pickColumn(row, ['Email Address', 'email_address', 'Email', 'E-mail Address', 'E-mail', 'email']),
    company: pickColumn(row, ['Company', 'company', 'Organization', 'organisation']),
    position: pickColumn(row, ['Position', 'position', 'Title', 'Job Title', 'job-title']),
    connected_on: normalizeDate(pickColumn(row, ['Connected On', 'ConnectedOn', 'connected_on', 'Date', 'Connection Date', 'Connected Date', 'Connected'])),
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
