"use client";

import { useState } from "react";
import { updateProfile } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Employee } from "@/types/database";

export function ProfileForm({ employee }: { employee: Employee }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated successfully");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Phone
          </Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={employee.phone ?? ""}
            placeholder="03XX-XXXXXXX or +92-XXX-XXXXXXX"
            pattern="^[\d\s\-\+\(\)]+$"
            title="Please enter a valid phone number (digits, spaces, +, -, () only)"
            className="bg-background/40 hover:border-border/80 transition-colors duration-200 focus-visible:border-primary focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cnic" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            CNIC (read-only)
          </Label>
          <Input
            id="cnic"
            value={employee.cnic_number ?? ""}
            disabled
            className="bg-muted/40 cursor-not-allowed border-border/40 text-muted-foreground opacity-80"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Address
        </Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={employee.address ?? ""}
          rows={2}
          className="bg-background/40 hover:border-border/80 transition-colors duration-200 focus-visible:border-primary focus-visible:ring-primary/20 min-h-20"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="emergency_contact_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Emergency Contact Name
          </Label>
          <Input
            id="emergency_contact_name"
            name="emergency_contact_name"
            defaultValue={employee.emergency_contact_name ?? ""}
            className="bg-background/40 hover:border-border/80 transition-colors duration-200 focus-visible:border-primary focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emergency_contact_phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Emergency Contact Phone
          </Label>
          <Input
            id="emergency_contact_phone"
            name="emergency_contact_phone"
            defaultValue={employee.emergency_contact_phone ?? ""}
            placeholder="03XX-XXXXXXX or +92-XXX-XXXXXXX"
            pattern="^[\d\s\-\+\(\)]+$"
            title="Please enter a valid phone number (digits, spaces, +, -, () only)"
            className="bg-background/40 hover:border-border/80 transition-colors duration-200 focus-visible:border-primary focus-visible:ring-primary/20"
          />
        </div>
      </div>
      <div className="pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm font-semibold rounded-lg px-6"
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
