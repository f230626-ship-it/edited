"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Shield, Zap, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: Users,  label: "Team Management",    desc: "Unified HR & CRM in one workspace" },
  { icon: Zap,    label: "Real-time Insights",  desc: "Live dashboards and analytics" },
  { icon: Shield, label: "Enterprise Security", desc: "Role-based access & audit trails" },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const errParam = searchParams.get("error");
    const verifiedParam = searchParams.get("verified");
    if (errParam === "no_employee_profile") {
      setTimeout(() => setError("Your account exists but has no employee profile. Ask an administrator to link your account."), 0);
    } else if (errParam === "account_suspended") {
      setTimeout(() => setError("Your account has been suspended or deactivated. Please contact your administrator."), 0);
    } else if (errParam === "invalid_link") {
      setTimeout(() => setError("This password reset link is invalid or has expired. Please request a new one."), 0);
    }
    if (verifiedParam === "true") {
      setTimeout(() => setNotice("Email verified. You can now sign in."), 0);
    }
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";

    startTransition(async () => {
      try {
        const supabase = createClient();
        // Drop any dead refresh tokens before signing in
        await supabase.auth.signOut({ scope: "local" });

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError || !data.session) {
          setError(signInError?.message || "Invalid email or password");
          return;
        }

        // Confirm cookies are readable before navigating
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError("Signed in, but session cookies failed to save. Try Incognito, or clear site cookies for localhost.");
          return;
        }

        window.location.assign(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    });
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">

      {/* ── Left branding panel ── */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col overflow-hidden bg-card border-r border-border/40 p-10 xl:p-16">
        {/* Layered gradient meshes */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-violet-500/10" />
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-violet-500/8 blur-[100px]" />
          {/* Dot grid texture */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
        </div>

        {/* Centered inner content container for balanced SaaS hierarchy */}
        <div className="relative z-10 flex flex-col justify-between h-full max-w-md w-full mx-auto">
          {/* Logo with optimal breathing space & visual alignment */}
          <div className="pt-2 sm:pt-4 pb-4 pl-12 xl:pl-14">
            <Image
              src="/images/mindvista-official-logo-dark.png"
              alt="MindVista"
              height={268}
              width={358}
              priority
              className="h-14 w-auto object-contain hidden dark:block"
            />
            <Image
              src="/images/mindvista-official-logo-light.png"
              alt="MindVista"
              height={268}
              width={358}
              priority
              className="h-[105px] -ml-[33px] -my-[21px] w-auto object-contain dark:hidden"
            />
          </div>

          {/* Hero copy */}
          <div className="my-auto py-8">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Enterprise HRMS · CRM Platform
              </div>
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] text-foreground">
                One platform.<br />
                <span className="text-primary">Every team.</span>
              </h1>
              <p className="mt-4 text-sm xl:text-base text-muted-foreground leading-relaxed max-w-sm">
                MindVista unifies HR management and CRM workflows so your team can move faster, with full visibility.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
              className="mt-8 xl:mt-10 space-y-4"
            >
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
                    <Icon className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground/50 pb-2">
            © {new Date().getFullYear()} MindVista. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        {/* Subtle ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-primary/6 blur-3xl" />
        </div>

        {/* Mobile logo */}
        <div className="relative z-10 mb-8 lg:hidden">
          <Image
            src="/images/mindvista-official-logo-dark.png"
            alt="MindVista"
            height={268}
            width={358}
            priority
            className="h-14 w-auto object-contain hidden dark:block"
          />
          <Image
            src="/images/mindvista-official-logo-light.png"
            alt="MindVista"
            height={268}
            width={358}
            priority
            className="h-[105px] -my-[21px] w-auto object-contain dark:hidden"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-sm"
        >
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your MindVista workspace</p>
          </div>

          {/* Alerts */}
          {notice && (
            <Alert className="mb-5 animate-scale-in border-emerald-500/40 bg-emerald-500/10">
              <AlertDescription className="text-emerald-700 dark:text-emerald-400">{notice}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-5 animate-scale-in">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@mindvista.io"
                disabled={isPending}
                required
                autoComplete="email"
                className="h-11 rounded-xl border-border/60 bg-background/70 backdrop-blur-sm px-4 text-sm focus-visible:ring-primary/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  tabIndex={isPending ? -1 : undefined}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  disabled={isPending}
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl border-border/60 bg-background/70 backdrop-blur-sm px-4 pr-11 text-sm focus-visible:ring-primary/40 transition-all"
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
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl glow-brand font-semibold text-sm mt-2"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground/70">
            Don&apos;t have an account?{" "}
            <span className="text-muted-foreground font-medium">Contact your administrator.</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

