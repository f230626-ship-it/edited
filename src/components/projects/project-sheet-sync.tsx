"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  syncProjectsFromSheet,
  updateProjectSyncSettings,
} from "@/actions/project-sync";
import type { ProjectSyncMeta } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Settings2 } from "lucide-react";

export function ProjectSheetSyncControls({
  syncMeta,
}: {
  syncMeta: ProjectSyncMeta | null;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetId, setSheetId] = useState(syncMeta?.google_sheet_id ?? "");
  const [sheetTab, setSheetTab] = useState(syncMeta?.sheet_tab_name ?? "Projects & Clients Sheet");
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const result = await syncProjectsFromSheet({
        spreadsheetId: sheetId || undefined,
        tabName: sheetTab || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Synced ${result.total} rows — ${result.inserted} new, ${result.updated} updated`
      );
      window.location.reload();
    });
  }

  function handleSaveSettings() {
    startTransition(async () => {
      const result = await updateProjectSyncSettings({
        google_sheet_id: sheetId,
        sheet_tab_name: sheetTab,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Project sheet settings saved");
        setSettingsOpen(false);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setSettingsOpen(true)}
          disabled={isPending}
          className="pm-btn-outline text-xs sm:text-sm"
        >
          <Settings2 className="mr-1.5 h-3.5 w-3.5" />
          Sheet settings
        </Button>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isPending}
          className="pm-btn-outline text-primary border-primary/20 text-xs sm:text-sm"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
          Sync from Sheet
        </Button>
      </div>
      {syncMeta?.last_synced_at && (
        <p className="mt-1 w-full text-[11px] text-muted-foreground sm:w-auto">
          Last sync: {new Date(syncMeta.last_synced_at).toLocaleString()}
          {syncMeta.last_sync_message ? ` · ${syncMeta.last_sync_message}` : ""}
        </p>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projects Google Sheet</DialogTitle>
            <DialogDescription>
              Point at your projects tracking workbook. Share the sheet with the Google service account (Viewer).
              Cron syncs about every 2 weeks; you can sync anytime here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Spreadsheet ID</Label>
              <Input
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="From the sheet URL"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tab name</Label>
              <Input
                value={sheetTab}
                onChange={(e) => setSheetTab(e.target.value)}
                placeholder="Projects & Clients Sheet"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSettings} disabled={isPending}>
              Save settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
