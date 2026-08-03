"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import type { Employee, Project } from "@/types/database";
import { bulkImportProjects } from "@/actions/projects";
import { normalizeProjectStatus } from "@/lib/projects/sheet-parse";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: Employee[];
  existingProjects: Pick<Project, "name">[];
  onImportSuccess: () => void;
}

interface ParsedRow {
  rowNum: number;
  data: Partial<Project> & {
    manager_name?: string;
    team_members_raw?: string;
    bd_name?: string;
    dev_name?: string;
    project_type?: string | null;
    payment_structure?: string | null;
    project_rate?: string | null;
    expected_monthly_revenue?: number | null;
    profile_name?: string | null;
  };
  errors: string[];
  warnings: string[];
}

interface DetectedMapping {
  originalHeader: string;
  mappedTo: string;
  confidence: "high" | "medium" | "low";
}

const COLUMN_MAP_RULES: {
  field: string;
  fieldLabel: string;
  keywords: string[];
  required?: boolean;
}[] = [
  { field: "name", fieldLabel: "Project Name", keywords: ["project name", "project", "name", "title", "project title", "project_name"] },
  { field: "client_name", fieldLabel: "Client Name", keywords: ["client name", "client", "customer", "customer name", "client_name"] },
  { field: "project_type", fieldLabel: "Project Type", keywords: ["project type", "type", "engagement", "employment type"] },
  { field: "client_email", fieldLabel: "Client Email", keywords: ["client email", "email", "customer email", "client_email"] },
  { field: "client_contact_number", fieldLabel: "Client Contact", keywords: ["contact", "phone", "client contact", "client phone", "mobile", "telephone", "client_contact"] },
  { field: "company_name", fieldLabel: "Company Name", keywords: ["company", "company name", "organization", "org", "firm", "company_name"] },
  { field: "description", fieldLabel: "Description", keywords: ["description", "desc", "details", "about", "summary", "notes"] },
  { field: "industry", fieldLabel: "Industry", keywords: ["industry", "sector", "domain", "field"] },
  { field: "lead_source", fieldLabel: "Lead Source", keywords: ["lead source", "source", "how did", "referred", "origin", "lead_source"] },
  { field: "start_date", fieldLabel: "Start Date", keywords: ["start date", "start", "begin", "begins", "commencement", "start_date", "project start"] },
  { field: "expected_delivery_date", fieldLabel: "End Date", keywords: ["end date", "end", "deadline", "due date", "delivery date", "finish", "expected_delivery", "target date", "completion date"] },
  { field: "status", fieldLabel: "Status", keywords: ["status", "state", "phase", "stage", "project status"] },
  { field: "priority", fieldLabel: "Priority", keywords: ["priority", "importance", "urgency", "level"] },
  { field: "value", fieldLabel: "Total Contract Value", keywords: ["budget", "value", "cost", "price", "amount", "revenue", "fee", "total", "project value", "project budget", "total contract value", "contract value"] },
  { field: "payment_structure", fieldLabel: "Payment Structure", keywords: ["payment structure", "payment type", "billing", "milestones", "monthly", "weekly", "payment plan"] },
  { field: "project_rate", fieldLabel: "Project Rate", keywords: ["project rate", "rate", "hourly rate", "rate per hour", "pricing"] },
  { field: "expected_monthly_revenue", fieldLabel: "Expected Monthly Revenue", keywords: ["mrr", "monthly revenue", "expected monthly", "recurring revenue", "monthly income"] },
  { field: "currency", fieldLabel: "Currency", keywords: ["currency", "curr", "money"] },
  { field: "progress_percentage", fieldLabel: "Progress %", keywords: ["progress", "completion", "%", "percentage", "done", "completed %"] },
  { field: "manager_name", fieldLabel: "Project Manager", keywords: ["manager", "pm", "project manager", "lead", "project lead", "handled by"] },
  { field: "bd_name", fieldLabel: "Assigned BD", keywords: ["bd", "business development", "bd rep", "bd representative", "sales rep", "assigned bd"] },
  { field: "dev_name", fieldLabel: "Front Face", keywords: ["developer", "dev", "front face", "frontface", "engineer", "dev rep", "resource", "assigned resource"] },
  { field: "team_members_raw", fieldLabel: "Team Members", keywords: ["team", "team members", "members", "resources", "assignees", "staff", "team member"] },
  { field: "payment_status", fieldLabel: "Payment Status", keywords: ["payment", "payment status", "paid", "billing status"] },
  { field: "profile_name", fieldLabel: "Profile Name", keywords: ["profile", "profile name", "outreach profile", "sales profile"] },
  { field: "is_monthly_retainer", fieldLabel: "Monthly Retainer", keywords: ["retainer", "monthly", "recurring", "monthly retainer"] },
  { field: "retainer_amount", fieldLabel: "Retainer Amount", keywords: ["retainer amount", "monthly amount", "recurring amount"] },
  { field: "expected_profit", fieldLabel: "Expected Profit", keywords: ["profit", "expected profit", "margin", "net profit"] },
];

function autoMapColumns(headers: string[]): DetectedMapping[] {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  const mappings: DetectedMapping[] = [];
  const usedFields = new Set<string>();

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    let bestMatch: { field: string; fieldLabel: string; score: number } | null = null;

    for (const rule of COLUMN_MAP_RULES) {
      if (usedFields.has(rule.field)) continue;

      for (const kw of rule.keywords) {
        if (h === kw) {
          bestMatch = { field: rule.field, fieldLabel: rule.fieldLabel, score: 100 };
          break;
        }
        if (h.includes(kw) || kw.includes(h)) {
          const score = Math.min(h.length, kw.length) / Math.max(h.length, kw.length) * 80;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { field: rule.field, fieldLabel: rule.fieldLabel, score };
          }
        }
      }
      if (bestMatch && bestMatch.score === 100) break;
    }

    if (bestMatch && bestMatch.score >= 30) {
      usedFields.add(bestMatch.field);
      mappings.push({
        originalHeader: headers[i],
        mappedTo: bestMatch.fieldLabel,
        confidence: bestMatch.score >= 80 ? "high" : bestMatch.score >= 50 ? "medium" : "low",
      });
    } else {
      mappings.push({
        originalHeader: headers[i],
        mappedTo: "(skipped — no match)",
        confidence: "low",
      });
    }
  }

  return mappings;
}

function fuzzyExtract(row: Record<string, unknown>, field: string): string {
  for (const rule of COLUMN_MAP_RULES) {
    if (rule.field !== field) continue;
    for (const h of Object.keys(row)) {
      const hLower = h.toLowerCase().trim();
      for (const kw of rule.keywords) {
        if (hLower === kw || hLower.includes(kw) || kw.includes(hLower)) {
          return String(row[h] ?? "").trim();
        }
      }
    }
  }
  return "";
}

function fuzzyExtractNumber(row: Record<string, unknown>, field: string): number {
  const raw = fuzzyExtract(row, field);
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function fuzzyExtractBool(row: Record<string, unknown>, field: string): boolean {
  const raw = fuzzyExtract(row, field).toLowerCase();
  return raw === "yes" || raw === "true" || raw === "1";
}

export function ImportDialog({
  open,
  onOpenChange,
  allEmployees,
  existingProjects,
  onImportSuccess,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0 });
  const [detectedMappings, setDetectedMappings] = useState<DetectedMapping[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setStats({ total: 0, valid: 0, invalid: 0 });
    setDetectedMappings([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!importing) {
      onOpenChange(isOpen);
      if (!isOpen) resetState();
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const headers = [
        "Client Name", "Project Name", "Project Type", "Total Contract Value",
        "Payment Structure", "Start Date", "Project Rate", "Project Status",
        "Expected Monthly Revenue (MRR)", "Assigned Resource", "Profile Name",
        "Assigned BD", "End Date",
      ];

      const bd = allEmployees.find((e) => e.pm_role === "bd")?.full_name || "Reference";
      const resource = allEmployees.find((e) => e.pm_role === "developer")?.full_name || "Fatima";

      const sampleData = [
        {
          "Client Name": "Ember-AI",
          "Project Name": "Snap Dev",
          "Project Type": "Full Time",
          "Total Contract Value": 50000,
          "Payment Structure": "Weekly",
          "Start Date": "2026-03-24",
          "Project Rate": "1500RS/h",
          "Project Status": "Active",
          "Expected Monthly Revenue (MRR)": 8000,
          "Assigned Resource": resource,
          "Profile Name": "Fiza",
          "Assigned BD": bd,
          "End Date": "2026-07-04",
        },
        {
          "Client Name": "Zenith Retailers",
          "Project Name": "Zenith Mobile App",
          "Project Type": "Full Time",
          "Total Contract Value": 29000,
          "Payment Structure": "Milestones",
          "Start Date": "2026-06-01",
          "Project Rate": "1000RS/h",
          "Project Status": "In Progress",
          "Expected Monthly Revenue (MRR)": 5000,
          "Assigned Resource": resource,
          "Profile Name": "Fiza",
          "Assigned BD": bd,
          "End Date": "2026-09-30",
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "mindvista_projects_import_template.xlsx");
      toast.success("Template downloaded!");
    } catch {
      toast.error("Failed to generate template.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (selectedFile: File) => {
    setParsing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

        if (rows.length === 0) {
          toast.error("File is empty.");
          setParsing(false);
          return;
        }

        const rawHeaders = Object.keys(rows[0]);
        const mappings = autoMapColumns(rawHeaders);
        setDetectedMappings(mappings);

        const mappedFields = mappings.filter((m) => m.mappedTo !== "(skipped — no match)");
        const hasProjectName = mappedFields.some((m) => m.mappedTo === "Project Name");

        if (!hasProjectName) {
          toast.error("Could not detect a project name column. Please ensure one column contains project names/titles.");
          setParsing(false);
          return;
        }

        toast.info(`Detected ${mappedFields.length} of ${rawHeaders.length} columns automatically.`);

        const parsed: ParsedRow[] = [];
        let validCount = 0;
        let invalidCount = 0;

        const existingProjectNames = new Set(
          existingProjects.map((p) => p.name.toLowerCase().trim())
        );

        rows.forEach((row, index) => {
          const rowNum = index + 2;
          const errors: string[] = [];
          const warnings: string[] = [];

          const rawName = fuzzyExtract(row, "name");
          const rawClientName = fuzzyExtract(row, "client_name");
          const rawClientEmail = fuzzyExtract(row, "client_email");
          const rawClientContact = fuzzyExtract(row, "client_contact_number");
          const rawCompanyName = fuzzyExtract(row, "company_name");
          const rawDescription = fuzzyExtract(row, "description");
          const rawIndustry = fuzzyExtract(row, "industry");
          const rawLeadSource = fuzzyExtract(row, "lead_source");
          const rawStartDate = fuzzyExtract(row, "start_date");
          const rawEndDate = fuzzyExtract(row, "expected_delivery_date");
          const rawPM = fuzzyExtract(row, "manager_name");
          const rawBD = fuzzyExtract(row, "bd_name");
          const rawDev = fuzzyExtract(row, "dev_name");
          const rawTeam = fuzzyExtract(row, "team_members_raw");
          const rawPriority = fuzzyExtract(row, "priority");
          const rawStatus = fuzzyExtract(row, "status");
          const rawBudget = fuzzyExtractNumber(row, "value");
          const rawCurrency = fuzzyExtract(row, "currency");
          const rawRetainer = fuzzyExtractBool(row, "is_monthly_retainer");
          const rawRetainerAmount = fuzzyExtractNumber(row, "retainer_amount");
          const rawExpectedProfit = fuzzyExtractNumber(row, "expected_profit");
          const rawPaymentStatus = fuzzyExtract(row, "payment_status");
          const rawProgress = parseInt(fuzzyExtract(row, "progress_percentage") || "0", 10);
          const rawProjectType = fuzzyExtract(row, "project_type");
          const rawPaymentStructure = fuzzyExtract(row, "payment_structure");
          const rawProjectRate = fuzzyExtract(row, "project_rate");
          const rawExpectedMRR = fuzzyExtractNumber(row, "expected_monthly_revenue");
          const rawProfileName = fuzzyExtract(row, "profile_name");

          if (!rawName) errors.push("Project Name is required.");
          if (!rawClientName) warnings.push("Client Name not detected — will be empty.");

          if (rawStartDate) {
            const d = new Date(rawStartDate);
            if (isNaN(d.getTime())) errors.push(`Invalid Start Date: "${rawStartDate}".`);
          }
          if (rawEndDate) {
            const d = new Date(rawEndDate);
            if (isNaN(d.getTime())) errors.push(`Invalid End Date: "${rawEndDate}".`);
          }
          if (rawStartDate && rawEndDate) {
            const sd = new Date(rawStartDate);
            const ed = new Date(rawEndDate);
            if (!isNaN(sd.getTime()) && !isNaN(ed.getTime()) && ed < sd) {
              errors.push("End Date cannot be before Start Date.");
            }
          }

          if (rawName && existingProjectNames.has(rawName.toLowerCase())) {
            warnings.push(`"${rawName}" already exists in DB — will still import.`);
          }
          if (rawName && parsed.some((p) => p.data.name?.toLowerCase() === rawName.toLowerCase())) {
            warnings.push(`"${rawName}" appears multiple times in file.`);
          }

          let managerId: string | undefined = undefined;
          if (rawPM) {
            const match = allEmployees.find((e) => e.full_name.toLowerCase() === rawPM.toLowerCase());
            if (match) {
              managerId = match.id;
            } else {
              warnings.push(`PM "${rawPM}" not found — will import without assigned PM.`);
            }
          }

          let bdId: string | undefined = undefined;
          if (rawBD) {
            const match = allEmployees.find((e) => e.full_name.toLowerCase() === rawBD.toLowerCase());
            if (match) {
              bdId = match.id;
            } else {
              warnings.push(`BD "${rawBD}" not found — will be unassigned.`);
            }
          }

          let devId: string | undefined = undefined;
          if (rawDev) {
            const match = allEmployees.find((e) => e.full_name.toLowerCase() === rawDev.toLowerCase());
            if (match) {
              devId = match.id;
            } else {
              warnings.push(`Developer "${rawDev}" not found — will be unassigned.`);
            }
          }

          const teamMemberNames = rawTeam
            ? rawTeam.split(/[,;|]/).map((n) => n.trim()).filter(Boolean)
            : [];
          const matchedTeamIds: string[] = [];
          teamMemberNames.forEach((name) => {
            const match = allEmployees.find((e) => e.full_name.toLowerCase() === name.toLowerCase());
            if (match) {
              matchedTeamIds.push(match.id);
            } else {
              warnings.push(`Team member "${name}" not found — will skip.`);
            }
          });

          let status = "Lead Won";
          if (rawStatus) {
            status = normalizeProjectStatus(rawStatus);
            if (status !== rawStatus.trim()) {
              warnings.push(`Status "${rawStatus}" mapped to "${status}".`);
            }
          }

          const validPriorities = ["Low", "Medium", "High"];
          let priority = "Medium";
          if (rawPriority) {
            const matched = validPriorities.find((p) => p.toLowerCase() === rawPriority.toLowerCase());
            if (matched) {
              priority = matched;
            } else if (rawPriority.toLowerCase().includes("high") || rawPriority.toLowerCase().includes("urgent")) {
              priority = "High";
            } else if (rawPriority.toLowerCase().includes("low")) {
              priority = "Low";
            } else {
              warnings.push(`Priority "${rawPriority}" unrecognized — defaulting to "Medium".`);
            }
          }

          const validIndustries = ["Real Estate", "Healthcare", "Restaurant", "Hotel", "E-commerce", "Other"];
          let industry: string | null = null;
          if (rawIndustry) {
            const matched = validIndustries.find((i) => i.toLowerCase() === rawIndustry.toLowerCase());
            if (matched) {
              industry = matched;
            } else {
              const fuzzyMatch = validIndustries.find((i) =>
                i.toLowerCase().includes(rawIndustry.toLowerCase()) ||
                rawIndustry.toLowerCase().includes(i.toLowerCase())
              );
              if (fuzzyMatch) {
                industry = fuzzyMatch;
              } else {
                industry = "Other";
                warnings.push(`Industry "${rawIndustry}" not recognized — mapped to "Other".`);
              }
            }
          }

          const validLeadSources = ["Fiverr", "Upwork", "LinkedIn", "Website", "Referral", "Cold Email", "Other"];
          let leadSource: string | null = null;
          if (rawLeadSource) {
            const matched = validLeadSources.find((s) => s.toLowerCase() === rawLeadSource.toLowerCase());
            if (matched) {
              leadSource = matched;
            } else if (rawLeadSource.toLowerCase().includes("refer")) {
              leadSource = "Referral";
            } else if (rawLeadSource.toLowerCase().includes("linkedin")) {
              leadSource = "LinkedIn";
            } else {
              leadSource = "Other";
              warnings.push(`Lead Source "${rawLeadSource}" not recognized — mapped to "Other".`);
            }
          }

          const validPaymentStatuses = ["Pending", "Partial", "Paid", "Overdue"];
          let paymentStatus = "Pending";
          if (rawPaymentStatus) {
            const matched = validPaymentStatuses.find((s) => s.toLowerCase() === rawPaymentStatus.toLowerCase());
            if (matched) {
              paymentStatus = matched;
            } else {
              warnings.push(`Payment Status "${rawPaymentStatus}" unrecognized — defaulting to "Pending".`);
            }
          }

          const clientEmail = rawClientEmail || (rawClientName
            ? `${rawClientName.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`
            : "");

          if (errors.length > 0) {
            invalidCount++;
          } else {
            validCount++;
          }

          parsed.push({
            rowNum,
            data: {
              name: rawName || "",
              client_name: rawClientName || "",
              client_email: clientEmail || "",
              client_contact_number: rawClientContact || null,
              company_name: rawCompanyName || null,
              description: rawDescription || null,
              industry: (industry as Project["industry"]) || null,
              lead_source: (leadSource as Project["lead_source"]) || null,
              start_date: rawStartDate || new Date().toISOString().split("T")[0],
              expected_delivery_date: rawEndDate || rawStartDate || new Date().toISOString().split("T")[0],
              manager_id: managerId || null,
              bd_id: bdId || null,
              closing_developer_id: devId || null,
              status: status as Project["status"],
              priority: priority as "Low" | "Medium" | "High",
              value: rawBudget,
              currency: rawCurrency || "USD",
              is_monthly_retainer: rawRetainer,
              retainer_amount: rawRetainerAmount || null,
              expected_profit: rawExpectedProfit || null,
              payment_status: paymentStatus as Project["payment_status"],
              progress_percentage: isNaN(rawProgress) ? 0 : Math.min(Math.max(rawProgress, 0), 100),
              project_type: rawProjectType || null,
              payment_structure: rawPaymentStructure || null,
              project_rate: rawProjectRate || null,
              expected_monthly_revenue: rawExpectedMRR || null,
              profile_name: rawProfileName || null,
              manager_name: rawPM || undefined,
              bd_name: rawBD || undefined,
              dev_name: rawDev || undefined,
              team_members_raw: rawTeam || undefined,
              ...({ team_employee_ids: matchedTeamIds } as unknown as object),
            },
            errors,
            warnings,
          });
        });

        setParsedRows(parsed);
        setStats({ total: rows.length, valid: validCount, invalid: invalidCount });
        toast.success(`Parsed: ${validCount} ready, ${invalidCount} skipped.`);
      } catch (err) {
        console.error("Parse error:", err);
        toast.error("Failed to parse file. Make sure it's a valid spreadsheet or CSV.");
      } finally {
        setParsing(false);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("No valid records to import.");
      return;
    }

    setImporting(true);
    try {
      const importPayload = validRows.map((r) => ({
        ...r.data,
        team_employee_ids: (r.data as unknown as { team_employee_ids: string[] }).team_employee_ids,
      }));

      const response = await bulkImportProjects(importPayload);

      if (!response.success && response.errors && response.errors.length > 0) {
        const errMsg = response.errors.slice(0, 3).map((e) => `Row ${e.row}: ${e.error}`).join("; ");
        toast.error(`Import failed: ${errMsg}${response.errors.length > 3 ? ` (+${response.errors.length - 3} more)` : ""}`);
      } else if (!response.success) {
        toast.error("Import failed. Check backend logs.");
      } else {
        const msg = response.errors && response.errors.length > 0
          ? `Imported ${response.successCount} projects (${response.errors.length} rows failed — check preview).`
          : `Imported ${response.successCount} projects successfully!`;
        toast.success(msg);
        onImportSuccess();
        handleClose(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="pm-glass-dialog sm:max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col p-6">
        <DialogHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Bulk Project Import</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="pm-btn-outline flex items-center gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Download Template
            </Button>
          </div>
          <DialogDescription className="text-xs mt-1">
            Upload any Excel, CSV, TSV, or text file. Column headers are auto-detected — no fixed format needed.
          </DialogDescription>
        </DialogHeader>

        {!file && (
          <div className="pm-upload-zone mt-4">
            <UploadCloud className="h-10 w-10 text-primary/60 mb-3" />
            <p className="text-sm font-semibold mb-1">Drag and drop any project list file</p>
            <p className="text-xs text-muted-foreground mb-4">.xlsx, .xls, .csv, .tsv, .txt, .ods — up to 10MB. Any column names work.</p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv,.tsv,.txt,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="pm-btn-primary text-primary-foreground"
            >
              Select File
            </Button>
          </div>
        )}

        {parsing && (
          <div className="flex flex-col items-center justify-center p-8 mt-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Detecting columns & parsing rows...</p>
          </div>
        )}

        {file && !parsing && (
          <div className="space-y-4 mt-4 flex-1">
            <div className="flex items-center justify-between bg-muted/40 border rounded-lg p-3 text-xs">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">{file.name}</p>
                  <p className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              {!importing && (
                <Button variant="ghost" size="icon" onClick={resetState} className="h-7 w-7 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {detectedMappings.length > 0 && (
              <div className="bg-muted/30 border rounded-lg p-3">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-2">Auto-Detected Column Mappings</p>
                <div className="flex flex-wrap gap-1.5">
                  {detectedMappings.map((m, i) => (
                    <Badge
                      key={i}
                      variant={m.mappedTo === "(skipped — no match)" ? "outline" : "secondary"}
                      className={`text-[10px] gap-1 ${
                        m.confidence === "high" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" :
                        m.confidence === "medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                        m.mappedTo === "(skipped — no match)" ? "bg-muted text-muted-foreground" :
                        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {m.originalHeader} → {m.mappedTo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Rows</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Ready to Import</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.valid}</p>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
                <p className="text-[10px] uppercase font-semibold text-red-600 dark:text-red-400">Skipped (Errors)</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.invalid}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Data Import Preview</p>
              <div className="pm-table-card max-h-[300px] overflow-y-auto">
                <Table className="pm-table">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-16 text-center">Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>BD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row) => (
                      <TableRow
                        key={row.rowNum}
                        className={
                          row.errors.length > 0
                            ? "bg-red-500/5 hover:bg-red-500/10 border-red-200/20 dark:border-red-900/10"
                            : "hover:bg-muted/30"
                        }
                      >
                        <TableCell className="text-center font-mono text-xs">{row.rowNum}</TableCell>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <div className="flex flex-col gap-1 text-[11px] text-destructive font-medium">
                              {row.errors.map((err, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0" /> {err}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                                <CheckCircle2 className="h-3 w-3 shrink-0" /> Valid
                              </span>
                              {row.warnings.map((warn, i) => (
                                <span key={i} className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  {warn}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.data.client_name || "—"}</TableCell>
                        <TableCell className="font-semibold text-xs">{row.data.name || "—"}</TableCell>
                        <TableCell className="text-xs">{row.data.project_type || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.data.value ? `${row.data.currency || "$"}${row.data.value.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{row.data.payment_structure || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{row.data.project_rate || "—"}</TableCell>
                        <TableCell className="text-xs">{row.data.status || "—"}</TableCell>
                        <TableCell className="text-xs">{row.data.bd_name || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 border-t border-border/40 pt-4 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => handleClose(false)} disabled={importing} className="pm-btn-outline">
            Cancel
          </Button>
          {file && !parsing && (
            <Button
              onClick={handleImportSubmit}
              disabled={importing || stats.valid === 0}
              className="pm-btn-primary text-primary-foreground flex items-center gap-1.5"
              size="sm"
            >
              {importing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing {stats.valid}...
                </>
              ) : (
                `Confirm Import (${stats.valid} records)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
