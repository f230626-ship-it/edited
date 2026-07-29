"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { BrandLogo } from "@/components/ui/brand-logo";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

// Supabase sends the user to this page with a hash fragment containing
// the access_token and refresh_token. The @supabase/ssr library's
// createBrowserClient picks these up automatically from the URL hash
// and sets the session cookies, so by the time the server action runs,
// supabase.auth.getUser() returns the password-reset user.
//
// The page therefore just needs to collect the new password and call
// the resetPassword server action, which calls supabase.auth.updateUser().

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Supabase appends error details as query params when the link is invalid
    const errCode = searchParams.get("error_code");
    if (errCode) {
      setTimeout(() => setTokenError(true), 0);
    }
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await resetPassword(formData);

      if (result?.error) {
        setError(result.error.message);
        return;
      }

      setSuccess(true);
      // Redirect to login after a short delay so the user sees the success msg
      setTimeout(() => router.push("/login"), 2500);
    });
  }

  if (tokenError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            This password reset link is invalid or has expired. Please request a
            new one.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <AlertDescription className="text-green-700 dark:text-green-400">
          Password updated successfully. Redirecting to sign in…
        </AlertDescription>
      </Alert>
    );
  }

  // Detect auth/session errors that mean the token is no longer valid
  const isAuthError =
    error &&
    (error.toLowerCase().includes("expired") ||
      error.toLowerCase().includes("failed to reset") ||
      error.toLowerCase().includes("session") ||
      error.toLowerCase().includes("auth"));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="space-y-2">
          <Alert variant="destructive" className="animate-scale-in">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {isAuthError && (
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/forgot-password"
                className="underline hover:text-foreground transition-colors"
              >
                Request a new reset link
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            disabled={isPending}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="bg-background/50 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={isPending ? -1 : undefined}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Must be 8+ characters with uppercase, lowercase, number, and symbol.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            disabled={isPending}
            required
            autoComplete="new-password"
            className="bg-background/50 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={isPending ? -1 : undefined}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" />
            Updating…
          </span>
        ) : (
          "Set new password"
        )}
      </Button>
    </form>
  );
}

function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-80 w-[30rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/8 blur-2xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[450px]"
      >
        <Card className="border-border/50 bg-card/85 shadow-2xl shadow-primary/8 [--card-spacing:1.75rem] sm:[--card-spacing:2.25rem]">
          {/* Branding header — logo sits tight above title */}
          <div className="flex flex-col items-center gap-1 px-6 pt-4 pb-4 text-center">
            <div className="w-[6rem] sm:w-[7.5rem] mb-[-0.75rem]">
              <BrandLogo
                lightLogoSrc="/images/mindvista-official-logo-light.png"
                darkLogoSrc="/images/mindvista-official-logo-dark.png"
                priority
                variant="stacked"
                className="mx-auto transition-transform hover:scale-[1.01]"
                sizes="(max-width: 640px) 6rem, 7.5rem"
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-card-foreground">Set new password</h1>
              <p className="text-sm text-muted-foreground">Choose a strong password for your account</p>
            </div>
          </div>
          <CardContent>
            <Suspense fallback={<div className="flex justify-center py-4"><Spinner /></div>}>
              <ResetPasswordForm />
            </Suspense>

            <div className="mt-4 flex justify-center">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ResetPasswordPage />
    </Suspense>
  );
}
