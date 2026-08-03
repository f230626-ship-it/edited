"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkedInUploadDialog } from "./upload-dialog";
import type { OutreachProfile } from "@/actions/linkedin-outreach";

interface LinkedInUploadButtonProps {
  profiles: OutreachProfile[];
}

export function LinkedInUploadButton({
  profiles,
}: LinkedInUploadButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Upload LinkedIn Export</span>
        <span className="sm:hidden">Upload</span>
      </Button>

      <LinkedInUploadDialog
        open={open}
        onOpenChange={setOpen}
        profiles={profiles}
      />
    </>
  );
}
