import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee, canAccessSales, isSalesOwner } from "@/lib/auth";
import { createHash } from "node:crypto";
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
  parseMessagesData,
  detectPartialExport,
  extractOwnerDisplayName,
  calculateYearsOfExperience,
  getTopSkills,
} from "@/lib/linkedin/parser";
import { buildMonthlyPeriodStats } from "@/lib/linkedin/period-rollup";
import type { CSVDataset, LinkedInSummary } from "@/types/linkedin";
import { revalidatePath } from "next/cache";

/**
 * POST /api/linkedin/upload
 * Requires: file (ZIP)
 * Optional: sales_profile_id — if omitted, match/create from Profile.csv in the ZIP
 */
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
    let salesProfileId = (formData.get("sales_profile_id") as string | null)?.trim() || "";

    if (!zipFile) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
    if (!zipFile.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ success: false, error: "File must be a ZIP archive" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const isAdmin = isSalesOwner(employee.role);

    // Parse ZIP early so we can auto-match / auto-create profiles
    const arrayBuffer = await zipFile.arrayBuffer();

    // Compute SHA-256 hash for duplicate detection
    const fileHash = createHash("sha256").update(Buffer.from(arrayBuffer)).digest("hex");

    // Check for exact file hash duplicate (if file_hash column exists)
    let hashDuplicate = false;
    try {
      const { data: existingHash } = await supabase
        .from("linkedin_imports")
        .select("id, filename, status")
        .eq("file_hash", fileHash)
        .not("status", "eq", "failed")
        .maybeSingle();

      if (existingHash) {
        hashDuplicate = true;
        return NextResponse.json(
          {
            success: false,
            error: `Duplicate file detected. This ZIP was already uploaded as "${existingHash.filename}" (status: ${existingHash.status}).`,
          },
          { status: 409 }
        );
      }
    } catch {
      // file_hash column may not exist yet — migration 032 handles this
      // Skip file hash dedup if column is missing
    }

    const datasets = await extractAndParseZip(arrayBuffer);
    const profileDataset = datasets.find((d) => d.type === "profile");
    const ownerName =
      extractOwnerDisplayName(profileDataset?.data?.[0] ?? null) ||
      zipFile.name.replace(/\.zip$/i, "").replace(/Basic_LinkedInDataExport[_-]*/i, "").trim() ||
      "LinkedIn Profile";

    // Resolve sales profile: explicit id → match by name → create
    let profile: { id: string; name: string; employee_id: string | null; is_active: boolean } | null =
      null;
    let createdProfile = false;

    if (salesProfileId) {
      const { data } = await supabase
        .from("sales_profiles")
        .select("id, name, employee_id, is_active")
        .eq("id", salesProfileId)
        .maybeSingle();
      profile = data;
    }

    if (!profile) {
      // Only search profiles assigned to the current employee (admins see all)
      let profileQuery = supabase
        .from("sales_profiles")
        .select("id, name, employee_id, is_active, platform")
        .eq("is_active", true);

      if (!isAdmin) {
        profileQuery = profileQuery.eq("employee_id", employee.id);
      }

      const { data: existingProfiles } = await profileQuery;

      const linkedInProfiles = (existingProfiles || []).filter(
        (p) => !p.platform || p.platform === "linkedin"
      );

      const { matchSalesProfileId } = await import("@/lib/linkedin/profile-match");
      const matchedId = matchSalesProfileId(ownerName, linkedInProfiles);
      if (matchedId) {
        profile = linkedInProfiles.find((p) => p.id === matchedId) || null;
        salesProfileId = matchedId;
      }
    }

    // Enforce ownership: non-admins can only upload for their own profiles
    if (!isAdmin && profile && profile.employee_id && profile.employee_id !== employee.id) {
      return NextResponse.json(
        { success: false, error: "You can only upload exports for profiles assigned to you" },
        { status: 403 }
      );
    }

    if (!profile) {
      // Check if a profile with this name already exists (prevents duplicates)
      const { data: nameDuplicate } = await supabase
        .from("sales_profiles")
        .select("id, name, employee_id")
        .ilike("name", ownerName)
        .eq("is_active", true)
        .maybeSingle();

      if (nameDuplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `A profile named "${ownerName}" already exists (assigned to another employee). Please ask the admin to assign it to you.`,
          },
          { status: 409 }
        );
      }

      // truly new profile — auto-create assigned to uploader
      const { data: created, error: createErr } = await supabase
        .from("sales_profiles")
        .insert({
          name: ownerName,
          employee_id: employee.id,
          platform: "linkedin",
          is_active: true,
          created_by: employee.id,
        })
        .select("id, name, employee_id, is_active")
        .single();

      if (createErr || !created) {
        return NextResponse.json(
          { success: false, error: createErr?.message || `Could not create profile for "${ownerName}"` },
          { status: 500 }
        );
      }
      profile = created;
      salesProfileId = created.id;
      createdProfile = true;
    }

    const handlerEmployeeId = profile.employee_id || employee.id;

    // Replace prior imports for this sales profile
    await supabase.from("linkedin_imports").delete().eq("sales_profile_id", salesProfileId);

    // Insert import record — try with file_hash first (migration 032), fall back without
    let importRecord: any = null;
    let importError: any = null;

    const baseImport = {
      employee_id: handlerEmployeeId,
      sales_profile_id: salesProfileId,
      uploaded_by: employee.id,
      filename: zipFile.name,
      file_size: zipFile.size,
      status: "processing" as const,
    };

    // Try with file_hash (requires migration 032)
    const withHash = await supabase
      .from("linkedin_imports")
      .insert({ ...baseImport, file_hash: fileHash })
      .select()
      .single();

    if (withHash.error && withHash.error.message?.includes("file_hash")) {
      // Column doesn't exist yet — insert without it
      const withoutHash = await supabase
        .from("linkedin_imports")
        .insert(baseImport)
        .select()
        .single();
      importRecord = withoutHash.data;
      importError = withoutHash.error;
    } else {
      importRecord = withHash.data;
      importError = withHash.error;
    }

    if (importError || !importRecord) {
      return NextResponse.json(
        { success: false, error: importError?.message || "Failed to create import record" },
        { status: 500 }
      );
    }

    const importId = importRecord.id;
    const datasetTypes = datasets.map((d) => d.type);
    const isPartial = detectPartialExport(datasetTypes);
    const displayName = ownerName || profile.name;

    const invitations = datasets.find((d) => d.type === "invitations");
    const connections = datasets.find((d) => d.type === "connections");
    const messagesDs = datasets.find((d) => d.type === "messages");

    const parsedInvites = invitations ? parseInvitationsData(invitations.data) : [];
    const parsedConns = connections ? parseConnectionsData(connections.data) : [];
    const parsedMsgs = messagesDs
      ? parseMessagesData(messagesDs.data, [displayName, profile.name])
      : [];

    const periodRows = buildMonthlyPeriodStats({
      invitations: parsedInvites,
      connections: parsedConns,
      messages: parsedMsgs,
      isPartial,
    });

    // Duplicate check BEFORE deleting prior imports
    if (periodRows.length > 0) {
      let isDuplicate = false;
      const existingPeriods: string[] = [];
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      for (const row of periodRows) {
        const { data: existing } = await supabase
          .from("linkedin_profile_period_stats")
          .select("period_year, period_month")
          .eq("sales_profile_id", salesProfileId)
          .eq("period_year", row.period_year)
          .eq("period_month", row.period_month)
          .maybeSingle();

        if (existing) {
          isDuplicate = true;
          existingPeriods.push(`${monthNames[row.period_month - 1]} ${row.period_year}`);
        }
      }

      if (isDuplicate) {
        // Clean up the empty import record
        await supabase.from("linkedin_imports").delete().eq("id", importId);
        return NextResponse.json(
          {
            success: false,
            error: `Duplicate rejected: "${profile.name}" already has data for ${existingPeriods.join(", ")}. Upload a ZIP with different months only.`,
          },
          { status: 409 }
        );
      }
    }

    const storeResults = await storeAllData(
      supabase,
      importId,
      handlerEmployeeId,
      salesProfileId,
      datasets,
      displayName
    );

    if (periodRows.length > 0) {
      const upsertPayload = periodRows.map((row) => ({
        sales_profile_id: salesProfileId,
        period_year: row.period_year,
        period_month: row.period_month,
        invites_sent: row.invites_sent,
        connections_made: row.connections_made,
        acceptance_rate: row.acceptance_rate,
        messages_sent: row.messages_sent,
        initial_messages: row.initial_messages,
        follow_ups_sent: row.follow_ups_sent,
        replies_received: row.replies_received,
        reply_rate: row.reply_rate,
        is_partial: row.is_partial,
        import_id: importId,
        synced_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from("linkedin_profile_period_stats")
        .upsert(upsertPayload, { onConflict: "sales_profile_id,period_year,period_month" });

      if (upsertErr) {
        storeResults["period_stats"] = `ERR: ${upsertErr.message}`;
      } else {
        storeResults["period_stats"] = `ok(${periodRows.length} months)`;
      }
    }

    const summary = generateSummary(datasets);
    summary.total_connections = parsedConns.length;
    summary.total_messages = parsedMsgs.length;

    await supabase
      .from("linkedin_imports")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        datasets_detected: datasetTypes,
        summary,
        is_partial: isPartial,
        owner_display_name: displayName,
      })
      .eq("id", importId);

    revalidatePath("/sales/linkedin");
    revalidatePath("/sales/linkedin/intelligence");
    revalidatePath("/sales/admin/profiles");

    // Check if all profiles have uploaded and send report if so
    if (periodRows.length > 0) {
      try {
        const { checkAllUploadedAndSendReport } = await import("@/actions/linkedin-outreach");
        const reportCheck = await checkAllUploadedAndSendReport();
        console.log(
          "[upload] Profile completion:",
          `${reportCheck.uploadedCount}/${reportCheck.requiredCount} profiles`,
          reportCheck.allUploaded ? "→ ALL COMPLETE → generating report" : `→ missing: ${reportCheck.missingProfiles?.join(", ") || "none"}`,
          reportCheck.reportSent ? "→ report sent to admin" : ""
        );
      } catch (e) {
        console.error("[upload] Auto-report check failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      importId,
      salesProfileId,
      profileName: profile.name,
      createdProfile,
      isPartial,
      ownerName: displayName,
      months: periodRows.length,
      datasets: datasets.map((d) => ({ type: d.type, rows: d.rowCount })),
      storeResults,
    });
  } catch (err: unknown) {
    console.error("[LinkedIn API upload] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function extractAndParseZip(arrayBuffer: ArrayBuffer): Promise<CSVDataset[]> {
  const datasets: CSVDataset[] = [];
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(arrayBuffer);

  const csvFiles = Object.keys(zip.files).filter(
    (f) => !zip.files[f].dir && f.toLowerCase().endsWith(".csv")
  );

  for (const filename of csvFiles) {
    try {
      const content = await zip.files[filename].async("text");
      const basename = filename.split("/").pop()?.split("\\").pop() || filename;
      const type = detectDatasetType(basename);
      const data = parseCSV(content);
      if (data.length > 0) {
        datasets.push({
          filename,
          type,
          rowCount: data.length,
          columns: Object.keys(data[0]),
          data,
        });
      }
    } catch (e: unknown) {
      console.error(
        `[LinkedIn API upload] Failed to parse "${filename}":`,
        e instanceof Error ? e.message : e
      );
    }
  }
  return datasets;
}

async function storeAllData(
  supabase: ReturnType<typeof createAdminClient>,
  importId: string,
  employeeId: string,
  salesProfileId: string,
  datasets: CSVDataset[],
  ownerName: string
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const base = { import_id: importId, employee_id: employeeId };

  for (const dataset of datasets) {
    try {
      switch (dataset.type) {
        case "profile": {
          const d = parseProfileData(dataset.data);
          if (d) {
            const { error } = await supabase.from("linkedin_profiles").insert({ ...base, ...d });
            results.profile = error ? `ERR: ${error.message}` : "ok";
          }
          break;
        }
        case "positions": {
          const rows = parsePositionsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_positions")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.positions = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "skills": {
          const rows = parseSkillsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_skills")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.skills = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "endorsements": {
          const rows = parseEndorsementsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_endorsements")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.endorsements = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "projects": {
          const rows = parseProjectsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_projects")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.projects = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "education": {
          const rows = parseEducationData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_education")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.education = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "certifications": {
          const rows = parseCertificationsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_certifications")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.certifications = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "invitations": {
          const rows = parseInvitationsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_invitations")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.invitations = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "connections": {
          const rows = parseConnectionsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_connections")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.connections = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "messages": {
          const rows = parseMessagesData(dataset.data, [ownerName]);
          if (rows.length) {
            // Cap insert size for very large exports
            const chunkSize = 500;
            let inserted = 0;
            let lastError: string | null = null;
            for (let i = 0; i < rows.length; i += chunkSize) {
              const chunk = rows.slice(i, i + chunkSize).map((r) => ({
                ...base,
                sales_profile_id: salesProfileId,
                ...r,
              }));
              const { error } = await supabase.from("linkedin_messages").insert(chunk);
              if (error) {
                lastError = error.message;
                break;
              }
              inserted += chunk.length;
            }
            results.messages = lastError
              ? `ERR: ${lastError} (inserted ${inserted})`
              : `ok(${inserted})`;
          }
          break;
        }
        case "company_follows": {
          const rows = parseCompanyFollowsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_company_follows")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.company_follows = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "learning": {
          const rows = parseLearningData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_learning")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.learning = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "events": {
          const rows = parseEventsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_events")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.events = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "job_applications": {
          const rows = parseJobApplicationsData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_job_applications")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.job_applications = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        case "rich_media": {
          const rows = parseRichMediaData(dataset.data);
          if (rows.length) {
            const { error } = await supabase
              .from("linkedin_rich_media")
              .insert(rows.map((r) => ({ ...base, ...r })));
            results.rich_media = error ? `ERR: ${error.message}` : `ok(${rows.length})`;
          }
          break;
        }
        default:
          results[dataset.type] = "skipped(unknown type)";
      }
    } catch (e: unknown) {
      results[dataset.type] = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  return results;
}

function generateSummary(datasets: CSVDataset[]): LinkedInSummary {
  const summary: LinkedInSummary = {};
  for (const dataset of datasets) {
    switch (dataset.type) {
      case "positions": {
        summary.total_positions = dataset.rowCount;
        const positions = parsePositionsData(dataset.data);
        summary.years_of_experience = calculateYearsOfExperience(positions);
        const cur = positions.find((p) => p.is_current);
        if (cur) {
          summary.current_company = cur.company_name;
          summary.current_title = cur.title;
        }
        break;
      }
      case "skills":
        summary.total_skills = dataset.rowCount;
        break;
      case "endorsements": {
        summary.total_endorsements = dataset.rowCount;
        const ends = parseEndorsementsData(dataset.data);
        summary.top_skills = getTopSkills(ends, 5);
        summary.strongest_expertise = getTopSkills(ends, 3);
        break;
      }
      case "projects":
        summary.total_projects = dataset.rowCount;
        break;
      case "certifications":
        summary.total_certifications = dataset.rowCount;
        break;
      case "education":
        summary.total_education = dataset.rowCount;
        break;
      case "invitations":
        summary.total_invitations = dataset.rowCount;
        break;
      case "connections":
        summary.total_connections = dataset.rowCount;
        break;
      case "messages":
        summary.total_messages = dataset.rowCount;
        break;
      case "company_follows":
        summary.total_companies_followed = dataset.rowCount;
        break;
      case "learning":
        summary.total_learning_courses = dataset.rowCount;
        break;
      case "events":
        summary.total_events = dataset.rowCount;
        break;
      case "job_applications":
        summary.total_job_applications = dataset.rowCount;
        break;
      case "rich_media":
        summary.total_rich_media = dataset.rowCount;
        break;
    }
  }
  return summary;
}
