"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveProfilePhotoUrl } from "@/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Camera } from "lucide-react";
import { toast } from "sonner";

export function ProfilePhotoUpload({
  employeeId,
  fullName,
  currentUrl,
}: {
  employeeId: string;
  fullName: string;
  currentUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setLoading(true);
    try {
      // Upload directly from browser to Supabase Storage (bypasses Next.js body limits)
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${employeeId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);
      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Save the URL server-side
      const result = await saveProfilePhotoUrl(photoUrl);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setPreview(photoUrl);
      toast.success("Profile photo updated");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="h-24 w-24 border-2 border-primary/30">
          <AvatarImage src={preview ?? undefined} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
            <Spinner size="sm" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="mr-2 h-4 w-4" />
        Upload Photo
      </Button>
      <p className="text-xs text-muted-foreground text-center px-3">Max 5MB · JPG, PNG, WebP</p>
    </div>
  );
}
