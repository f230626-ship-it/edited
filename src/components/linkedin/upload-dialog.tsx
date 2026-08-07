"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileArchive,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { OutreachProfile } from "@/actions/linkedin-outreach";
import { listLinkedInUploadProfiles } from "@/actions/linkedin-outreach";
import { matchSalesProfileId } from "@/lib/linkedin/profile-match";

interface LinkedInUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: OutreachProfile[];
}

type UploadStage = "idle" | "uploading" | "completed" | "error";

type QueueItem = {
  id: string;
  file: File;
  profileId: string;
  detectedOwner: string | null;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function peekOwnerFromZip(file: File): Promise<string | null> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    for (const name of Object.keys(zip.files)) {
      if (zip.files[name].dir) continue;
      const bas = name.split("/").pop()?.split("\\").pop() || name;
      if (!/^profile\.csv$/i.test(bas)) continue;
      const text = await zip.files[name].async("text");

      // Quote-aware CSV parsing — handles "Lahore, Pakistan" style fields
      function parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const next = line[i + 1];
          if (char === '"') {
            if (inQuotes && next === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      }

      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return null;

      // Find the header row (first row with "First Name" or "Last Name")
      let headerLine = lines[0];
      let dataLine = lines[1];
      for (let i = 0; i < Math.min(5, lines.length - 1); i++) {
        const h = lines[i].toLowerCase();
        if (h.includes("first name") || h.includes("firstname") || h.includes("last name")) {
          headerLine = lines[i];
          dataLine = lines[i + 1];
          break;
        }
      }

      const headers = parseCSVLine(headerLine);
      const values = parseCSVLine(dataLine);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h.trim()] = values[i] || ""; });

      const first =
        row["First Name"] || row["FirstName"] || row["first_name"] || "";
      const last = row["Last Name"] || row["LastName"] || row["last_name"] || "";
      const full = `${first} ${last}`.trim();
      return full || null;
    }
  } catch {
    /* ignore peek errors */
  }
  return null;
}


export function LinkedInUploadDialog({
  open,
  onOpenChange,
  profiles: initialProfiles,
}: LinkedInUploadDialogProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<OutreachProfile[]>(initialProfiles);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Always refresh full profile list when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingProfiles(true);
    listLinkedInUploadProfiles()
      .then((list) => {
        if (cancelled) return;
        if (list.length > 0) setProfiles(list);
        else if (initialProfiles.length > 0) setProfiles(initialProfiles);
      })
      .catch(() => {
        if (!cancelled && initialProfiles.length > 0) setProfiles(initialProfiles);
      })
      .finally(() => {
        if (!cancelled) setLoadingProfiles(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, initialProfiles]);

  // When the profile catalog arrives/updates, re-match from ZIP owner only —
  // never force the dashboard's selected profile onto every file.
  useEffect(() => {
    if (profiles.length === 0) return;
    setQueue((prev) =>
      prev.map((item) => {
        if (item.status !== "pending") return item;
        const matched = matchSalesProfileId(item.detectedOwner, profiles) || "";
        return { ...item, profileId: matched };
      })
    );
  }, [profiles]);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) =>
        f.name.toLowerCase().endsWith(".zip")
      );
      if (files.length === 0) {
        toast.error("Please choose one or more .zip files");
        return;
      }
      for (const file of files) {
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 100MB`);
          continue;
        }
      }

      const items: QueueItem[] = [];
      for (const file of files.filter((f) => f.size <= 100 * 1024 * 1024)) {
        const owner = await peekOwnerFromZip(file);
        // Only auto-select when ZIP owner confidently matches a profile
        const matched = matchSalesProfileId(owner, profiles) || "";
        items.push({
          id: newId(),
          file,
          profileId: matched,
          detectedOwner: owner,
          status: "pending",
        });
      }
      setQueue((prev) => [...prev, ...items]);
      setStage("idle");
      setError("");
    },
    [profiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const readyCount = queue.filter((q) => q.status === "pending").length;
  const canUpload =
    queue.length > 0 &&
    stage !== "uploading";

  const handleUpload = async () => {
    if (!canUpload) {
      toast.error("Add at least one ZIP file");
      return;
    }

    setStage("uploading");
    setError("");
    let done = 0;
    let failed = 0;
    const total = queue.length;

    for (const item of queue) {
      if (item.status === "done") {
        done += 1;
        continue;
      }
      updateItem(item.id, { status: "uploading", message: "Uploading…" });
      setMessage(`Uploading ${item.file.name} (${done + 1}/${total})…`);
      setProgress(Math.round((done / total) * 100));

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        // Optional — server auto-matches / auto-creates when empty
        if (item.profileId) formData.append("sales_profile_id", item.profileId);
        const res = await fetch("/api/linkedin/upload", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || "Upload failed");
        }
        const created = result.createdProfile ? " · new profile created" : "";
        const msg = result.isPartial
          ? `Imported (partial)${created}`
          : `Imported ${result.months || 0} month(s)${created}`;
        updateItem(item.id, {
          status: "done",
          message: msg,
          profileId: result.salesProfileId || item.profileId,
        });
        done += 1;
      } catch (err: unknown) {
        failed += 1;
        updateItem(item.id, {
          status: "error",
          message: err instanceof Error ? err.message : "Failed",
        });
      }
      setProgress(Math.round(((done + failed) / total) * 100));
    }

    if (failed === 0) {
      setStage("completed");
      setMessage(`All ${done} export(s) imported`);
      toast.success(`Imported ${done} LinkedIn export(s)`);
      setTimeout(() => {
        router.refresh();
        onOpenChange(false);
        resetDialog();
      }, 1200);
    } else {
      setStage("error");
      setError(`${done} succeeded, ${failed} failed — fix profile mapping and retry failed files`);
      toast.error(`${failed} upload(s) failed`);
      // Keep successful ones marked done; leave failed for retry
      setQueue((prev) => prev.filter((q) => q.status !== "done"));
      setStage("idle");
    }
  };

  const resetDialog = () => {
    setQueue([]);
    setStage("idle");
    setProgress(0);
    setMessage("");
    setError("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetDialog();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload LinkedIn exports</DialogTitle>
          <DialogDescription>
            Drop one or more ZIP archives. We read Profile.csv, match an existing sales profile,
            or automatically create a new one if it&apos;s a new LinkedIn account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loadingProfiles ? (
            <p className="text-xs text-muted-foreground">Loading profiles…</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {profiles.length} profile{profiles.length === 1 ? "" : "s"} available in the dropdown
              {profiles.length > 0
                ? ` (${profiles.map((p) => p.name).join(", ")})`
                : " — upload will auto-create from Profile.csv"}
            </p>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 transition ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border/60 bg-muted/20"
            }`}
          >
            <FileArchive className="h-8 w-8 text-muted-foreground" />
            <p className="text-center text-sm text-muted-foreground">
              Drop multiple ZIP files here, or choose files.
              <br />
              <span className="text-xs">
                New LinkedIn accounts are created automatically from Profile.csv.
              </span>
            </p>
            <input
              type="file"
              accept=".zip,application/zip"
              multiple
              className="hidden"
              id="linkedin-zip-input"
              onChange={(e) => {
                if (e.target.files?.length) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("linkedin-zip-input")?.click()}
              disabled={stage === "uploading"}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose ZIP files
            </Button>
          </div>

          {queue.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Files ({queue.length}) · {readyCount} ready
              </p>
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/60 bg-card/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.detectedOwner
                          ? `Detected: ${item.detectedOwner}`
                          : "Owner unknown — will create/match on upload"}
                        {item.message ? ` · ${item.message}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => removeItem(item.id)}
                      disabled={stage === "uploading"}
                      aria-label="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Assign to profile
                  </label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark]"
                    value={item.profileId}
                    onChange={(e) => updateItem(item.id, { profileId: e.target.value })}
                    disabled={stage === "uploading" || loadingProfiles}
                  >
                    <option value="">Auto — match or create from ZIP</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id} className="bg-background text-foreground">
                        {p.name}
                        {p.handlerName ? ` · ${p.handlerName}` : ""}
                      </option>
                    ))}
                  </select>
                  {!item.profileId && item.detectedOwner && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      No exact match for “{item.detectedOwner}” — pick a profile or leave Auto to create one.
                    </p>
                  )}
                  {item.status === "error" && (
                    <p className="flex items-center gap-1 text-xs text-red-400">
                      <XCircle className="h-3.5 w-3.5" />
                      {item.message}
                    </p>
                  )}
                  {item.status === "done" && (
                    <p className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {item.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {stage === "uploading" && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {message}
              </p>
            </div>
          )}

          {stage === "completed" && (
            <p className="flex items-center gap-2 text-sm text-emerald-500">
              <CheckCircle className="h-4 w-4" />
              {message}
            </p>
          )}
          {error && (
            <p className="flex items-center gap-2 text-sm text-red-500">
              <XCircle className="h-4 w-4" />
              {error}
            </p>
          )}

          <Button className="w-full" onClick={handleUpload} disabled={!canUpload}>
            {stage === "uploading"
              ? "Uploading…"
              : queue.length > 1
                ? `Upload & parse ${queue.length} files`
                : "Upload & parse"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
