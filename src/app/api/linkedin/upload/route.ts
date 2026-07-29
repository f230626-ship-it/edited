import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee, canAccessSales } from "@/lib/auth";
import {
  detectDatasetType,
  parseCSV,
  parseProfileData,
  parsePositionsData,
  parseSkillsData,
  parseEndorsementsData,
  parseProjectsData,
  parseEducationData,
  parseCertificationsData,
  parseInvitationsData,
  parseConnectionsData,
  parseCompanyFollowsData,
  parseLearningData,
  parseEventsData,
  parseJobApplicationsData,
  parseRichMediaData,
  calculateYearsOfExperience,
  getTopSkills,
} from "@/lib/linkedin/parser";
import type { CSVDataset, LinkedInSummary } from "@/types/linkedin";

// ============================================================================
// POST /api/linkedin/upload
// API-route based ZIP upload — uses the latest compiled parser on every call.
// This bypasses the server action cache in .next so parser fixes take effect
// immediately without needing a server restart.
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    if (!canAccessSales(employee)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await req.formData();
    const zipFile = formData.get("file") as File | null;
    const requestedEmployeeId = formData.get("employee_id") as string | null;
    const employeeId = requestedEmployeeId || employee.id;

    if (employee.role !== "admin" && employeeId !== employee.id) {
      return NextResponse.json({ success: false, error: "Cannot upload for another employee" }, { status: 403 });
    }

    if (!zipFile) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
    if (!zipFile.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ success: false, error: "File must be a ZIP archive" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Delete old imports for this employee (cascades to all linkedin_* rows)
    await supabase.from("linkedin_imports").delete().eq("employee_id", employeeId);

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from("linkedin_imports")
      .insert({
        employee_id: employeeId,
        uploaded_by: employee.id,
        filename: zipFile.name,
        file_size: zipFile.size,
        status: "processing",
      })
      .select()
      .single();

    if (importError || !importRecord) {
      return NextResponse.json({ success: false, error: "Failed to create import record" }, { status: 500 });
    }

    const importId = importRecord.id;
    console.log(`[LinkedIn API upload] Import record: ${importId}`);

    // ── Parse ZIP ────────────────────────────────────────────────────────────
    const arrayBuffer = await zipFile.arrayBuffer();
    const datasets = await extractAndParseZip(arrayBuffer);

    // ── Store data ───────────────────────────────────────────────────────────
    const storeResults = await storeAllData(supabase, importId, employeeId, datasets);

    // ── Generate summary ─────────────────────────────────────────────────────
    const summary = generateSummary(datasets);

    await supabase
      .from("linkedin_imports")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        datasets_detected: datasets.map((d) => d.type),
        summary,
      })
      .eq("id", importId);

    console.log(`[LinkedIn API upload] Done. ${datasets.map((d) => `${d.type}(${d.rowCount})`).join(", ")}`);
    console.log(`[LinkedIn API upload] Store results:`, JSON.stringify(storeResults));

    return NextResponse.json({
      success: true,
      importId,
      datasets: datasets.map((d) => ({ type: d.type, rows: d.rowCount })),
      storeResults,
    });
  } catch (err: any) {
    console.error("[LinkedIn API upload] Error:", err);
    return NextResponse.json({ success: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

// ============================================================================
// ZIP extraction
// ============================================================================

async function extractAndParseZip(arrayBuffer: ArrayBuffer): Promise<CSVDataset[]> {
  const datasets: CSVDataset[] = [];
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(arrayBuffer);

  const csvFiles = Object.keys(zip.files).filter(
    (f) => !zip.files[f].dir && f.toLowerCase().endsWith(".csv")
  );
  console.log(`[LinkedIn API upload] CSV files in ZIP (${csvFiles.length}):`, csvFiles);

  for (const filename of csvFiles) {
    try {
      const content = await zip.files[filename].async("text");
      const basename = filename.split("/").pop()?.split("\\").pop() || filename;
      const type = detectDatasetType(basename);
      const data = parseCSV(content);

      console.log(`[LinkedIn API upload] "${basename}" → type:${type}, rows:${data.length}${data.length > 0 ? ", cols:" + Object.keys(data[0]).join("|") : ""}`);

      if (data.length > 0) {
        datasets.push({ filename, type, rowCount: data.length, columns: Object.keys(data[0]), data });
      } else {
        console.warn(`[LinkedIn API upload] No rows from "${basename}"`);
      }
    } catch (e: any) {
      console.error(`[LinkedIn API upload] Failed to parse "${filename}":`, e?.message);
    }
  }
  return datasets;
}

// ============================================================================
// Store all datasets
// ============================================================================

async function storeAllData(
  supabase: ReturnType<typeof createAdminClient>,
  importId: string,
  employeeId: string,
  datasets: CSVDataset[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  for (const dataset of datasets) {
    try {
      switch (dataset.type) {
        case "profile": {
          const d = parseProfileData(dataset.data);
          if (d) {
            const { error } = await supabase.from("linkedin_profiles").insert({ import_id: importId, employee_id: employeeId, ...d });
            results["profile"] = error ? `ERR: ${error.message}` : "ok";
          }
          break;
        }
        case "positions": {
          const rows = parsePositionsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_positions").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["positions"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "skills": {
          const rows = parseSkillsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_skills").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["skills"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "endorsements": {
          const rows = parseEndorsementsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_endorsements").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["endorsements"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "projects": {
          const rows = parseProjectsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_projects").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["projects"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "education": {
          const rows = parseEducationData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_education").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["education"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "certifications": {
          const rows = parseCertificationsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_certifications").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["certifications"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "invitations": {
          const rows = parseInvitationsData(dataset.data);
          // Log first raw row to see actual column values
          if (dataset.data.length > 0) {
            console.log('[LinkedIn API upload] First raw invitation row:', JSON.stringify(dataset.data[0]));
            console.log('[LinkedIn API upload] First parsed invitation row:', JSON.stringify(rows[0]));
          }
          if (rows.length) {
            const withDates = rows.filter((r) => r.invitation_date !== null);
            const nullDates = rows.length - withDates.length;
            const { error } = await supabase.from("linkedin_invitations").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["invitations"] = error ? `ERR: ${error.message}` : `ok(${rows.length}, ${withDates.length} with dates, ${nullDates} null dates)`;
          }
          break;
        }
        case "connections": {
          const rows = parseConnectionsData(dataset.data);
          if (rows.length) {
            const withDates = rows.filter((r) => r.connected_on !== null);
            const nullDates = rows.length - withDates.length;
            const { error } = await supabase.from("linkedin_connections").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["connections"] = error ? `ERR: ${error.message}` : `ok(${rows.length}, ${withDates.length} with dates, ${nullDates} null dates)`;
          }
          break;
        }
        case "company_follows": {
          const rows = parseCompanyFollowsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_company_follows").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["company_follows"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "learning": {
          const rows = parseLearningData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_learning").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["learning"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "events": {
          const rows = parseEventsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_events").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["events"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "job_applications": {
          const rows = parseJobApplicationsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_job_applications").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["job_applications"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "rich_media": {
          const rows = parseRichMediaData(dataset.data);
          if (rows.length) {
            const { error } = await supabase.from("linkedin_rich_media").insert(rows.map((r) => ({ import_id: importId, employee_id: employeeId, ...r })));
            results["rich_media"] = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        default:
          results[dataset.type] = "skipped(unknown type)";
      }
    } catch (e: any) {
      results[dataset.type] = `EXCEPTION: ${e?.message}`;
    }
  }
  return results;
}

// ============================================================================
// Summary
// ============================================================================

function generateSummary(datasets: CSVDataset[]): LinkedInSummary {
  const summary: LinkedInSummary = {};
  for (const dataset of datasets) {
    switch (dataset.type) {
      case "positions":
        summary.total_positions = dataset.rowCount;
        const positions = parsePositionsData(dataset.data);
        summary.years_of_experience = calculateYearsOfExperience(positions);
        const cur = positions.find((p) => p.is_current);
        if (cur) { summary.current_company = cur.company_name; summary.current_title = cur.title; }
        break;
      case "skills": summary.total_skills = dataset.rowCount; break;
      case "endorsements":
        summary.total_endorsements = dataset.rowCount;
        const ends = parseEndorsementsData(dataset.data);
        summary.top_skills = getTopSkills(ends, 5);
        summary.strongest_expertise = getTopSkills(ends, 3);
        break;
      case "projects": summary.total_projects = dataset.rowCount; break;
      case "certifications": summary.total_certifications = dataset.rowCount; break;
      case "education": summary.total_education = dataset.rowCount; break;
      case "invitations": summary.total_invitations = dataset.rowCount; break;
      case "company_follows": summary.total_companies_followed = dataset.rowCount; break;
      case "learning": summary.total_learning_courses = dataset.rowCount; break;
      case "events": summary.total_events = dataset.rowCount; break;
      case "job_applications": summary.total_job_applications = dataset.rowCount; break;
      case "rich_media": summary.total_rich_media = dataset.rowCount; break;
    }
  }
  return summary;
}
