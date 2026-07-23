"use server";

// ============================================================================
// LinkedIn Intelligence Module - Server Actions
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
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
  parseCompanyFollowsData,
  parseLearningData,
  parseEventsData,
  parseJobApplicationsData,
  parseRichMediaData,
  calculateYearsOfExperience,
  getTopSkills,
} from "@/lib/linkedin/parser";
import type {
  LinkedInImport,
  LinkedInSummary,
  CSVDataset,
  LinkedInDatasetType,
} from "@/types/linkedin";

// ============================================================================
// Get LinkedIn Imports
// ============================================================================

export async function getLinkedInImports(employeeId?: string): Promise<LinkedInImport[]> {
  const supabase = await createClient();

  let query = supabase
    .from("linkedin_imports")
    .select("*")
    .order("created_at", { ascending: false });

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching LinkedIn imports:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Get Latest LinkedIn Import for Employee
// ============================================================================

export async function getLatestLinkedInImport(
  employeeId: string
): Promise<LinkedInImport | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("linkedin_imports")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching latest LinkedIn import:", error);
    return null;
  }

  return data;
}

// ============================================================================
// Process LinkedIn Export
// ============================================================================

export async function processLinkedInExport(
  formData: FormData
): Promise<{ success: boolean; importId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get employee ID from form or use current user
    const employeeId = formData.get("employee_id") as string || user.id;
    const zipFile = formData.get("file") as File;

    if (!zipFile) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    if (!zipFile.name.endsWith(".zip")) {
      return { success: false, error: "File must be a ZIP archive" };
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from("linkedin_imports")
      .insert({
        employee_id: employeeId,
        uploaded_by: user.id,
        filename: zipFile.name,
        file_size: zipFile.size,
        status: "processing",
      })
      .select()
      .single();

    if (importError || !importRecord) {
      return { success: false, error: "Failed to create import record" };
    }

    // Extract and parse ZIP file
    const arrayBuffer = await zipFile.arrayBuffer();
    const datasets = await extractAndParseZip(arrayBuffer);

    // Store parsed data in database
    await storeLinkedInData(
      supabase,
      importRecord.id,
      employeeId,
      datasets
    );

    // Generate summary
    const summary = generateSummary(datasets);

    // Update import record
    await supabase
      .from("linkedin_imports")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        datasets_detected: datasets.map((d) => d.type),
        summary,
      })
      .eq("id", importRecord.id);

    revalidatePath("/sales/analytics/linkedin");

    return { success: true, importId: importRecord.id };
  } catch (error: any) {
    console.error("Error processing LinkedIn export:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

// ============================================================================
// Extract and Parse ZIP
// ============================================================================

async function extractAndParseZip(
  arrayBuffer: ArrayBuffer
): Promise<CSVDataset[]> {
  const datasets: CSVDataset[] = [];

  try {
    // Note: In production, use a proper ZIP library like jszip or unzipper
    // For now, this is a placeholder that expects CSV files to be extracted server-side
    
    // This would use JSZip or similar:
    // const JSZip = require('jszip');
    // const zip = await JSZip.loadAsync(arrayBuffer);
    
    // For each file in ZIP:
    // const files = Object.keys(zip.files);
    // for (const filename of files) {
    //   if (filename.endsWith('.csv')) {
    //     const content = await zip.files[filename].async('text');
    //     const type = detectDatasetType(filename);
    //     const data = parseCSV(content);
    //     datasets.push({
    //       filename,
    //       type,
    //       rowCount: data.length,
    //       columns: Object.keys(data[0] || {}),
    //       data,
    //     });
    //   }
    // }

    console.warn("ZIP extraction not yet implemented - requires jszip package");
    
    return datasets;
  } catch (error) {
    console.error("Error extracting ZIP:", error);
    throw error;
  }
}

// ============================================================================
// Store LinkedIn Data
// ============================================================================

async function storeLinkedInData(
  supabase: any,
  importId: string,
  employeeId: string,
  datasets: CSVDataset[]
): Promise<void> {
  for (const dataset of datasets) {
    try {
      switch (dataset.type) {
        case "profile":
          const profileData = parseProfileData(dataset.data);
          if (profileData) {
            await supabase.from("linkedin_profiles").insert({
              import_id: importId,
              employee_id: employeeId,
              ...profileData,
            });
          }
          break;

        case "positions":
          const positions = parsePositionsData(dataset.data);
          if (positions.length > 0) {
            await supabase.from("linkedin_positions").insert(
              positions.map((p) => ({
                import_id: importId,
                employee_id: employeeId,
                ...p,
              }))
            );
          }
          break;

        case "skills":
          const skills = parseSkillsData(dataset.data);
          if (skills.length > 0) {
            await supabase.from("linkedin_skills").insert(
              skills.map((s) => ({
                import_id: importId,
                employee_id: employeeId,
                ...s,
              }))
            );
          }
          break;

        case "endorsements":
          const endorsements = parseEndorsementsData(dataset.data);
          if (endorsements.length > 0) {
            await supabase.from("linkedin_endorsements").insert(
              endorsements.map((e) => ({
                import_id: importId,
                employee_id: employeeId,
                ...e,
              }))
            );
          }
          break;

        case "projects":
          const projects = parseProjectsData(dataset.data);
          if (projects.length > 0) {
            await supabase.from("linkedin_projects").insert(
              projects.map((p) => ({
                import_id: importId,
                employee_id: employeeId,
                ...p,
              }))
            );
          }
          break;

        case "education":
          const education = parseEducationData(dataset.data);
          if (education.length > 0) {
            await supabase.from("linkedin_education").insert(
              education.map((e) => ({
                import_id: importId,
                employee_id: employeeId,
                ...e,
              }))
            );
          }
          break;

        case "certifications":
          const certifications = parseCertificationsData(dataset.data);
          if (certifications.length > 0) {
            await supabase.from("linkedin_certifications").insert(
              certifications.map((c) => ({
                import_id: importId,
                employee_id: employeeId,
                ...c,
              }))
            );
          }
          break;

        case "invitations":
          const invitations = parseInvitationsData(dataset.data);
          if (invitations.length > 0) {
            await supabase.from("linkedin_invitations").insert(
              invitations.map((i) => ({
                import_id: importId,
                employee_id: employeeId,
                ...i,
              }))
            );
          }
          break;

        case "company_follows":
          const companyFollows = parseCompanyFollowsData(dataset.data);
          if (companyFollows.length > 0) {
            await supabase.from("linkedin_company_follows").insert(
              companyFollows.map((c) => ({
                import_id: importId,
                employee_id: employeeId,
                ...c,
              }))
            );
          }
          break;

        case "learning":
          const learning = parseLearningData(dataset.data);
          if (learning.length > 0) {
            await supabase.from("linkedin_learning").insert(
              learning.map((l) => ({
                import_id: importId,
                employee_id: employeeId,
                ...l,
              }))
            );
          }
          break;

        case "events":
          const events = parseEventsData(dataset.data);
          if (events.length > 0) {
            await supabase.from("linkedin_events").insert(
              events.map((e) => ({
                import_id: importId,
                employee_id: employeeId,
                ...e,
              }))
            );
          }
          break;

        case "job_applications":
          const jobApps = parseJobApplicationsData(dataset.data);
          if (jobApps.length > 0) {
            await supabase.from("linkedin_job_applications").insert(
              jobApps.map((j) => ({
                import_id: importId,
                employee_id: employeeId,
                ...j,
              }))
            );
          }
          break;

        case "rich_media":
          const richMedia = parseRichMediaData(dataset.data);
          if (richMedia.length > 0) {
            await supabase.from("linkedin_rich_media").insert(
              richMedia.map((r) => ({
                import_id: importId,
                employee_id: employeeId,
                ...r,
              }))
            );
          }
          break;

        default:
          console.warn(`Unknown dataset type: ${dataset.type}`);
      }
    } catch (error) {
      console.error(`Error storing ${dataset.type} data:`, error);
      // Continue with other datasets
    }
  }
}

// ============================================================================
// Generate Summary
// ============================================================================

function generateSummary(datasets: CSVDataset[]): LinkedInSummary {
  const summary: LinkedInSummary = {};

  datasets.forEach((dataset) => {
    switch (dataset.type) {
      case "positions":
        summary.total_positions = dataset.rowCount;
        const positions = parsePositionsData(dataset.data);
        summary.years_of_experience = calculateYearsOfExperience(positions);
        const currentPos = positions.find((p) => p.is_current);
        if (currentPos) {
          summary.current_company = currentPos.company_name;
          summary.current_title = currentPos.title;
        }
        break;

      case "skills":
        summary.total_skills = dataset.rowCount;
        break;

      case "endorsements":
        summary.total_endorsements = dataset.rowCount;
        const endorsements = parseEndorsementsData(dataset.data);
        summary.top_skills = getTopSkills(endorsements, 5);
        summary.strongest_expertise = getTopSkills(endorsements, 3);
        break;

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
  });

  return summary;
}

// ============================================================================
// Get LinkedIn Analytics Data
// ============================================================================

export async function getLinkedInAnalytics(employeeId: string) {
  const supabase = await createClient();

  // Get latest completed import
  const latestImport = await getLatestLinkedInImport(employeeId);

  if (!latestImport) {
    return null;
  }

  // Fetch all data for this import
  const [
    { data: profile },
    { data: positions },
    { data: skills },
    { data: endorsements },
    { data: projects },
    { data: education },
    { data: certifications },
    { data: invitations },
    { data: companyFollows },
    { data: learning },
    { data: events },
    { data: jobApplications },
    { data: richMedia },
  ] = await Promise.all([
    supabase
      .from("linkedin_profiles")
      .select("*")
      .eq("import_id", latestImport.id)
      .single(),
    supabase
      .from("linkedin_positions")
      .select("*")
      .eq("import_id", latestImport.id)
      .order("started_on", { ascending: false }),
    supabase
      .from("linkedin_skills")
      .select("*")
      .eq("import_id", latestImport.id),
    supabase
      .from("linkedin_endorsements")
      .select("*")
      .eq("import_id", latestImport.id),
    supabase
      .from("linkedin_projects")
      .select("*")
      .eq("import_id", latestImport.id)
      .order("started_on", { ascending: false }),
    supabase
      .from("linkedin_education")
      .select("*")
      .eq("import_id", latestImport.id)
      .order("started_on", { ascending: false }),
    supabase
      .from("linkedin_certifications")
      .select("*")
      .eq("import_id", latestImport.id)
      .order("started_on", { ascending: false }),
    supabase
      .from("linkedin_invitations")
      .select("*")
      .eq("import_id", latestImport.id)
      .order("invitation_date", { ascending: false }),
    supabase
      .from("linkedin_company_follows")
      .select("*")
      .eq("import_id", latestImport.id),
    supabase
      .from("linkedin_learning")
      .select("*")
      .eq("import_id", latestImport.id)
      .order("completion_date", { ascending: false }),
    supabase
      .from("linkedin_events")
      .select("*")
      .eq("import_id", latestImport.id)
      .order("event_date", { ascending: false }),
    supabase
      .from("linkedin_job_applications")
      .select("*")
      .eq("import_id", latestImport.id)
      .order("application_date", { ascending: false }),
    supabase
      .from("linkedin_rich_media")
      .select("*")
      .eq("import_id", latestImport.id),
  ]);

  return {
    import: latestImport,
    profile,
    positions: positions || [],
    skills: skills || [],
    endorsements: endorsements || [],
    projects: projects || [],
    education: education || [],
    certifications: certifications || [],
    invitations: invitations || [],
    companyFollows: companyFollows || [],
    learning: learning || [],
    events: events || [],
    jobApplications: jobApplications || [],
    richMedia: richMedia || [],
  };
}
