const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MindVista HRMS — System Documentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      font-size: 10.5pt;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }

    h1, h2, h3, h4 {
      color: #111827;
      font-weight: 700;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }

    h1 {
      font-size: 24pt;
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 10px;
      margin-top: 0;
    }

    h2 {
      font-size: 16pt;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 6px;
      margin-top: 2em;
    }

    h3 {
      font-size: 12pt;
    }

    p {
      margin-top: 0;
      margin-bottom: 1em;
      color: #374151;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 1.2em;
      padding-left: 20px;
    }

    li {
      margin-bottom: 0.4em;
      color: #374151;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 9.5pt;
    }

    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      text-align: left;
    }

    th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #111827;
    }

    tr:nth-child(even) td {
      background-color: #fdfdfd;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.5pt;
      background-color: #f3f4f6;
      padding: 2px 4px;
      border-radius: 4px;
      color: #1f2937;
    }

    blockquote {
      margin: 1.5em 0;
      padding: 10px 20px;
      background-color: #f9fafb;
      border-left: 4px solid #3b82f6;
      color: #4b5563;
      font-style: italic;
    }

    .cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 90vh;
      border-left: 8px solid #3b82f6;
      padding-left: 40px;
      margin-left: 10px;
    }

    .cover h1 {
      font-size: 32pt;
      border: none;
      margin: 0;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: -0.025em;
    }

    .cover h2 {
      font-size: 16pt;
      font-weight: 400;
      color: #4b5563;
      border: none;
      margin-top: 10px;
      margin-bottom: 40px;
    }

    .metadata {
      font-size: 10pt;
      color: #6b7280;
    }

    .metadata table {
      border: none;
      width: auto;
      margin-top: 50px;
    }

    .metadata td {
      border: none;
      padding: 4px 12px 4px 0;
    }

    .diagram-container {
      margin: 30px 0;
      page-break-inside: avoid;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover">
    <h1>MindVista HRMS</h1>
    <h2>System Features & Implementation Documentation</h2>
  </div>

  <!-- Section 1 -->
  <h2>1. System Overview</h2>
  <p>MindVista HRMS is an all-in-one Human Resource Management System built specifically for internal operations. The platform integrates traditional HR workflows with project management, a sales CRM, LinkedIn outreach tracking, automated payroll, and AI standup scoring.</p>
  <ul>
    <li><strong>Target Users:</strong> Administrators, Team Leads, Business Developers, and Engineering Staff.</li>
    <li><strong>Core Goal:</strong> Minimize spreadsheets and combine multiple business modules under a single portal.</li>
  </ul>

  <!-- Diagram -->
  <div class="diagram-container">
    <h3 style="margin-top: 0; margin-bottom: 15px; font-weight: 600; color: #374151;">System Architecture & Data Flow Diagram</h3>
    <svg viewBox="0 0 800 450" width="100%" height="auto" style="display: block; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; font-family: 'Inter', sans-serif;">
      <!-- Group Backgrounds -->
      <rect x="15" y="45" width="160" height="360" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
      <rect x="220" y="45" width="220" height="360" rx="8" fill="#eff6ff" stroke="#dbeafe" stroke-width="1.5" stroke-dasharray="2 2" />
      <rect x="490" y="45" width="295" height="175" rx="8" fill="#f0fdf4" stroke="#dcfce7" stroke-width="1.5" />
      <rect x="490" y="235" width="295" height="170" rx="8" fill="#fffbeb" stroke="#fef3c7" stroke-width="1.5" />

      <!-- Group Headers -->
      <text x="95" y="32" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">USERS / CLIENTS</text>
      <text x="330" y="32" font-size="11" font-weight="700" fill="#1e40af" text-anchor="middle">MINDVISTA PORTAL (NEXT.JS)</text>
      <text x="637" y="32" font-size="11" font-weight="700" fill="#166534" text-anchor="middle">BACKEND (SUPABASE)</text>
      <text x="637" y="227" font-size="11" font-weight="700" fill="#854d0e" text-anchor="middle">EXTERNAL INTEGRATIONS</text>

      <!-- Users -->
      <g transform="translate(30, 60)">
        <rect width="130" height="50" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="65" y="30" font-size="11" font-weight="600" fill="#1e293b" text-anchor="middle">Administrator</text>
      </g>
      <g transform="translate(30, 140)">
        <rect width="130" height="50" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="65" y="30" font-size="11" font-weight="600" fill="#1e293b" text-anchor="middle">Developer</text>
      </g>
      <g transform="translate(30, 220)">
        <rect width="130" height="50" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="65" y="30" font-size="11" font-weight="600" fill="#1e293b" text-anchor="middle">Business Dev (BD)</text>
      </g>
      <g transform="translate(30, 300)">
        <rect width="130" height="50" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="65" y="30" font-size="11" font-weight="600" fill="#1e293b" text-anchor="middle">Regular Employee</text>
      </g>

      <!-- Portal Components -->
      <g transform="translate(240, 70)">
        <rect width="180" height="60" rx="6" fill="#ffffff" stroke="#bfdbfe" stroke-width="1.5" />
        <text x="90" y="27" font-size="11" font-weight="700" fill="#1e3a8a" text-anchor="middle">Next.js App Shell</text>
        <text x="90" y="44" font-size="9" fill="#60a5fa" text-anchor="middle">UI Dashboard Pages</text>
      </g>
      <g transform="translate(240, 190)">
        <rect width="180" height="60" rx="6" fill="#ffffff" stroke="#bfdbfe" stroke-width="1.5" />
        <text x="90" y="27" font-size="11" font-weight="700" fill="#1e3a8a" text-anchor="middle">Server Actions</text>
        <text x="90" y="44" font-size="9" fill="#60a5fa" text-anchor="middle">Secure Controller Logic</text>
      </g>
      <g transform="translate(240, 310)">
        <rect width="180" height="60" rx="6" fill="#ffffff" stroke="#bfdbfe" stroke-width="1.5" />
        <text x="90" y="27" font-size="11" font-weight="700" fill="#1e3a8a" text-anchor="middle">API Routes</text>
        <text x="90" y="44" font-size="9" fill="#60a5fa" text-anchor="middle">Cron & Webhook Endpoints</text>
      </g>

      <!-- Supabase Components -->
      <g transform="translate(510, 60)">
        <rect width="255" height="40" rx="6" fill="#ffffff" stroke="#bbf7d0" stroke-width="1.5" />
        <text x="127" y="24" font-size="10.5" font-weight="600" fill="#14532d" text-anchor="middle">PostgreSQL Database (Tables & RLS)</text>
      </g>
      <g transform="translate(510, 115)">
        <rect width="255" height="40" rx="6" fill="#ffffff" stroke="#bbf7d0" stroke-width="1.5" />
        <text x="127" y="24" font-size="10.5" font-weight="600" fill="#14532d" text-anchor="middle">Supabase Auth System</text>
      </g>
      <g transform="translate(510, 170)">
        <rect width="255" height="40" rx="6" fill="#ffffff" stroke="#bbf7d0" stroke-width="1.5" />
        <text x="127" y="24" font-size="10.5" font-weight="600" fill="#14532d" text-anchor="middle">Secure File Storage Buckets</text>
      </g>

      <!-- External Services -->
      <g transform="translate(510, 250)">
        <rect width="255" height="35" rx="6" fill="#ffffff" stroke="#fef08a" stroke-width="1.5" />
        <text x="127" y="21" font-size="10" font-weight="600" fill="#713f12" text-anchor="middle">Google Sheets API (Project & Sales Sync)</text>
      </g>
      <g transform="translate(510, 300)">
        <rect width="255" height="35" rx="6" fill="#ffffff" stroke="#fef08a" stroke-width="1.5" />
        <text x="127" y="21" font-size="10" font-weight="600" fill="#713f12" text-anchor="middle">Slack API (Standups & Reminders)</text>
      </g>
      <g transform="translate(510, 350)">
        <rect width="255" height="35" rx="6" fill="#ffffff" stroke="#fef08a" stroke-width="1.5" />
        <text x="127" y="21" font-size="10" font-weight="600" fill="#713f12" text-anchor="middle">AI Services (OpenAI, Groq, Gemini)</text>
      </g>

      <!-- Flow Connectors (Lines & Arrows) -->
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
        <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
        </marker>
      </defs>

      <!-- Users to Portal Shell -->
      <path d="M 160 85 L 240 85" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)" />
      <path d="M 160 165 L 200 165 L 200 110 L 240 110" fill="none" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)" />
      <path d="M 160 245 L 200 245 L 200 120 L 240 120" fill="none" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)" />

      <!-- Portal to Database -->
      <path d="M 420 220 L 465 220 L 465 80 L 510 80" fill="none" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrow-blue)" />
      <path d="M 420 220 L 465 220 L 465 135 L 510 135" fill="none" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrow-blue)" />
      
      <!-- API to External -->
      <path d="M 420 340 L 465 340 L 465 317 L 510 317" fill="none" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrow-blue)" />
      <path d="M 420 340 L 465 340 L 465 367 L 510 367" fill="none" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrow-blue)" />
    </svg>
  </div>

  <div class="page-break"></div>

  <!-- Section 2 -->
  <h2>2. User Roles and Permissions</h2>
  <p>The system uses a combination of a Primary Role and a PM (Project Management) Role to manage permissions.</p>
  
  <h3>Primary Roles</h3>
  <ul>
    <li><strong>Admin (<code>admin</code>):</strong> Complete system access. Oversees employee creation, salary configurations, payroll calculations, and system settings.</li>
    <li><strong>Developer (<code>developer</code>):</strong> Extended administrative console access for debugging and management support.</li>
    <li><strong>Employee (<code>employee</code>):</strong> Standard user access to view profile, apply for leaves, check in/out, log timesheets, and view assigned projects/assets.</li>
  </ul>

  <h3>Project Management Roles (PM Role)</h3>
  <ul>
    <li><strong>Business Development (<code>bd</code>):</strong> Identifies sales representatives. Used to grant access to the Sales CRM, LinkedIn outreach metrics, and client deal dashboards.</li>
    <li><strong>Developer (<code>developer</code>):</strong> Default classification for engineering and resource staff. Shows standard employee views.</li>
  </ul>
  <p><em>Note: Project creation, editing, and deletion are managed directly through the primary Admin role.</em></p>

  <h3>Permission Matrix</h3>
  <table>
    <thead>
      <tr>
        <th>Feature Module</th>
        <th>Admin</th>
        <th>Developer</th>
        <th>BD (pm_role)</th>
        <th>Employee</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Employee Setup</strong></td>
        <td>Full Control</td>
        <td>Full Control</td>
        <td>No</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>Leave Approval</strong></td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>Attendance Logs</strong></td>
        <td>Full Access</td>
        <td>Full Access</td>
        <td>No</td>
        <td>Self Only</td>
      </tr>
      <tr>
        <td><strong>Payroll Processing</strong></td>
        <td>Full + Approve</td>
        <td>View Only</td>
        <td>No</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>Project Creation</strong></td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>Sales CRM View</strong></td>
        <td>Yes</td>
        <td>No</td>
        <td>Yes</td>
        <td>No</td>
      </tr>
      <tr>
        <td><strong>Asset Assignment</strong></td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
        <td>View Assigned</td>
      </tr>
      <tr>
        <td><strong>Policies Upload</strong></td>
        <td>Yes</td>
        <td>Read Only</td>
        <td>Read Only</td>
        <td>Read Only</td>
      </tr>
    </tbody>
  </table>

  <!-- Section 3 -->
  <h2>3. Authentication and Security</h2>
  <ul>
    <li><strong>Rate Limiting:</strong> Protects <code>/login</code> by limiting attempts to 50 per email address in a 15-minute window.</li>
    <li><strong>JWT Verification:</strong> Authenticates tokens locally before making database requests to prevent tampered token execution.</li>
    <li><strong>Audit Trails:</strong> Immutable logs recorded in <code>auth_audit_log</code> track all sign-ins, logouts, and password resets with IP and user agent.</li>
    <li><strong>Pre-Onboarding Validation:</strong> Multi-layer email checks (typo assistance, EmailVerify.io and MailboxValidator verification, DNS MX checks) and Pakistani CNIC format checks.</li>
  </ul>

  <!-- Section 4 -->
  <h2>4. Dashboard</h2>
  <ul>
    <li><strong>Employee View:</strong> Displays leave balances, checking status, assigned assets, and a list of active personal projects.</li>
    <li><strong>Leads View:</strong> Highlights a pending leave approval card containing requests from subordinates.</li>
    <li><strong>BD View:</strong> Displays shortcuts to sales tracking (Daily Log, My Progress, ICP Filters) and outreach metrics.</li>
    <li><strong>Admin View:</strong> Shows aggregate metrics (Total Projects, connection acceptance rate, and average engineering completion percentages).</li>
  </ul>

  <!-- Section 5 -->
  <h2>5. Employee Management</h2>
  <ul>
    <li><strong>Profile Registry:</strong> Manages profile fields including name, email, CNIC number, date of birth, manager, lead, and work timings.</li>
    <li><strong>Employee Codes:</strong> Unique 5-digit numbers auto-generated by database triggers upon user creation.</li>
    <li><strong>Permissions Enforces:</strong> Core salary parameters (Basic Salary, Allowances, bank account info) are restricted to Admin updates only.</li>
    <li><strong>Self Service:</strong> Employees can edit their phone number, home address, and emergency contact information from the profile tab.</li>
  </ul>

  <!-- Section 6 -->
  <h2>6. Leave Management</h2>
  <ul>
    <li><strong>Leave Types:</strong> Sick Leave, Casual Leave, Annual Leave, and Unpaid Leave.</li>
    <li><strong>Deduction Engine:</strong> Automatically excludes weekends (Saturdays, Sundays) and official calendar holidays from leave deductions.</li>
    <li><strong>Application Workflow:</strong> Employee applies &rarr; System checks for overlaps and quota limits &rarr; Lead receives pending request.</li>
    <li><strong>Approval Actions:</strong> Leads or Admins can approve (one-click) or reject (requires a mandatory explanation).</li>
  </ul>

  <!-- Section 7 -->
  <h2>7. Attendance and Timesheets</h2>
  <ul>
    <li><strong>Presence Tracking:</strong> Daily check-in/out logging (Office, Remote, Half Day) with auto-computed decimal hours.</li>
    <li><strong>Timesheets:</strong> Task-level logs for engineering metrics. Description text containing keywords like "bug", "fix", or "issue" are auto-counted as bug fixes.</li>
  </ul>

  <!-- Section 8 -->
  <h2>8. Payroll and Compensation</h2>
  <ul>
    <li><strong>Compensation History:</strong> Versioned salary records. Creating a new version automatically dates and closes the previous one.</li>
    <li><strong>Commissions:</strong> Configurable rules based on paid or invoiced values. Auto-calculated during the payroll cycle.</li>
    <li><strong>Calculation Engine:</strong> Processes gross salaries, allowance packages, commissions, and unpaid leave deductions.</li>
    <li><strong>Anomaly Detection:</strong> Flags warning and critical issues (e.g. missing compensation details) before final processing.</li>
    <li><strong>Approval & Delivery:</strong> Approved cycles generate PDF slips and queue secure emails. Admin approves the queue to email slips to employees.</li>
    <li><strong>AI Assistant:</strong> Controlled read-only assistant utilizing real payroll data to answer admin queries.</li>
  </ul>

  <!-- Section 9 -->
  <h2>9. Performance Management</h2>
  <ul>
    <li><strong>Goal Tracking:</strong> Visual progress bars for goals. Progress can be updated manually or calculated automatically from timesheet and bug fix data.</li>
    <li><strong>Performance Reviews:</strong> Formal quarterly review records (strengths, weaknesses, ratings) submitted by Admins.</li>
  </ul>

  <!-- Section 10 -->
  <h2>10. Project Management</h2>
  <ul>
    <li><strong>Project Records:</strong> Stores details (value, status, priority, retainer status, timelines) synced from Google Sheets or imported via Excel templates.</li>
    <li><strong>Resource Allocation:</strong> Assigns employees to projects with custom roles and allocation percentages.</li>
    <li><strong>Access Rules:</strong> Admins see all projects. BDs see deals assigned to them. Engineers see projects where they are assigned as resources.</li>
  </ul>

  <!-- Section 11 -->
  <h2>11. Sales and Business Development</h2>
  <ul>
    <li><strong>Outreach Logs:</strong> Daily tracking of connections sent, accepted invites, messages, and meetings booked per sales profile.</li>
    <li><strong>Sales Profiles:</strong> Manages active platform profiles (LinkedIn, Upwork) and links them to spreadsheet IDs.</li>
    <li><strong>Command Center:</strong> Admin dashboard showing live stats, individual rep targets, sheet snapshots, and weekly report summaries.</li>
  </ul>

  <!-- Section 12 -->
  <h2>12. LinkedIn Intelligence and Outreach</h2>
  <ul>
    <li><strong>Intelligence Import:</strong> Parses user ZIP exports (connections, messages, skills) to calculate years of experience and top skills.</li>
    <li><strong>Outreach Dashboard:</strong> Switch profiles, compare two profiles side by side, and view monthly, quarterly, or yearly campaign performance charts.</li>
    <li><strong>Monthly Report:</strong> Headless browser automatically screenshots profile metrics at month-end, generates a PDF, and emails it to the Admin.</li>
    <li><strong>Slack Reminders:</strong> Sends automated Slack notifications to reps to trigger data exports and outreach follow-ups.</li>
  </ul>

  <!-- Section 13 -->
  <h2>13. ICP Filters (Ideal Customer Profile)</h2>
  <ul>
    <li><strong>Target Criteria:</strong> Tracks targeted job titles, companies, industry verticals, and regions.</li>
    <li><strong>Google Sheets Sync:</strong> Pulls filter details directly from linked sheets.</li>
    <li><strong>Search & Match:</strong> Full-text search engine with automatic geography extraction and duplicate detection.</li>
  </ul>

  <!-- Section 14 -->
  <h2>14. Asset Management</h2>
  <ul>
    <li><strong>Registry:</strong> Tracks company equipment (laptops, monitors, mobile phones, and software licenses).</li>
    <li><strong>Lifecycle:</strong> Asset registered (Available) &rarr; Assigned to employee (Assigned) &rarr; Employee returns equipment (Returned, status set back to Available) &rarr; History retained.</li>
  </ul>

  <!-- Section 15 -->
  <h2>15. Company Policies</h2>
  <ul>
    <li><strong>Library:</strong> Document center for company handbooks, SOPs, NDA templates, and leave policies.</li>
    <li><strong>Storage:</strong> Files are saved to private buckets in Supabase Storage with sanitized filenames. Admins upload and delete files; employees view or download them.</li>
  </ul>

  <!-- Section 16 -->
  <h2>16. Holiday Calendar</h2>
  <ul>
    <li><strong>Holiday Calendar:</strong> Allows admins to define official company holidays.</li>
    <li><strong>Leave Adjustments:</strong> Date checks automatically cross-reference this calendar to ensure leave balance days are not deducted during public holidays.</li>
  </ul>

  <!-- Section 17 -->
  <h2>17. Notifications</h2>
  <ul>
    <li><strong>In-App Alerts:</strong> A bell icon in the top header displays unread notification counts.</li>
    <li><strong>Leave Requests:</strong> Sends immediate alerts to employees when their leave requests are reviewed.</li>
  </ul>

  <!-- Section 18 -->
  <h2>18. Daily Standups (Slack Integration)</h2>
  <ul>
    <li><strong>Collection:</strong> Imports standup posts from the Slack channel using API scopes.</li>
    <li><strong>AI Parser:</strong> Extracts Completed Tasks, In Progress, and Blockers, and calculates performance scores.</li>
    <li><strong>Leaderboard & Trends:</strong> Ranks employees by standup quality and plots average scores over a 6-week trend chart.</li>
  </ul>

  <!-- Section 19 -->
  <h2>19. Team Hierarchy and Organization</h2>
  <ul>
    <li><strong>Reporting Relationships:</strong> Tracks managers and leads. The Lead handles leave approvals, while the Manager supervises performance.</li>
    <li><strong>Org Chart:</strong> Generates a recursive visual org tree showing reporting hierarchies from any selected node.</li>
  </ul>

  <!-- Section 20 -->
  <h2>20. Google Sheets Integration</h2>
  <ul>
    <li><strong>Service Account:</strong> Connects securely using credentials in environment variables.</li>
    <li><strong>Sheet Syncing:</strong> Bi-directional sync of projects (incorporating name matching for BDs and managers), sales progress tracking, and ICP filters.</li>
  </ul>

  <!-- Section 21 -->
  <h2>21. Automated Cron Jobs</h2>
  <p>Background jobs running on Vercel, secured via <code>CRON_SECRET</code> headers:</p>
  <ul>
    <li><strong><code>sync-standups</code>:</strong> Syncs standups from Slack and parses updates.</li>
    <li><strong><code>projects-sheet</code>:</strong> Daily import from the master Google Sheet.</li>
    <li><strong><code>linkedin-reminders</code>:</strong> Fires monthly, weekly, and follow-up alerts to the BD team.</li>
    <li><strong><code>monthly-report</code>:</strong> Generates and emails the LinkedIn analytics PDF.</li>
    <li><strong><code>payroll-reminder</code>:</strong> Notifies admins before pay day.</li>
    <li><strong><code>icp-filters</code>:</strong> Syncs ICP targeting criteria.</li>
  </ul>

  <!-- Section 22 -->
  <h2>22. Email System</h2>
  <ul>
    <li><strong>Transactional Emails:</strong> Sends password reset links, verifications, and payroll alerts.</li>
    <li><strong>Salary Slips:</strong> Slips are queued, approved by the admin, and sent with PDF attachments. Idempotency keys prevent double sending.</li>
  </ul>

  <!-- Section 23 -->
  <h2>23. Technology Stack</h2>
  <ul>
    <li><strong>Frontend:</strong> Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Recharts.</li>
    <li><strong>Backend:</strong> Supabase (PostgreSQL database, Auth, Storage, RLS).</li>
    <li><strong>Integrations:</strong> Google Sheets API, Slack API, OpenAI, Groq SDK, Puppeteer.</li>
  </ul>

  <!-- Section 24 -->
  <h2>24. Deployment and Infrastructure</h2>
  <ul>
    <li><strong>Hosting:</strong> Vercel for the Next.js app and serverless cron schedulers.</li>
    <li><strong>Database & Storage:</strong> Supabase handles data tables, auth sessions, and document storage buckets (<code>employee-documents</code>, <code>policies</code>, <code>assets-media</code>).</li>
    <li><strong>Environment Configuration:</strong> Managed via secure backend keys for external services.</li>
  </ul>

</body>
</html>
`;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfPath = '/Users/m5/mind vista hrms/docs/HRMS_DOCUMENTATION.pdf';
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '20mm',
      right: '20mm'
    }
  });

  await browser.close();
  console.log('PDF Generated Successfully at:', pdfPath);
}

run().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
