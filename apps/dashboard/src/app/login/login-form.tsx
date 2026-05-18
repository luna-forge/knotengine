"use client";

import { useState, useEffect } from "react";
import { Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { requestMagicLink } from "@/actions/auth";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      console.log(`[Auth] Affiliate referral detected: ${ref}`);
      Cookies.set("knot_affiliate_id", ref, { expires: 30 });
    }
  }, [searchParams]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await requestMagicLink(email);
      setSent(true);
      toast.success("Magic link sent! Check your inbox.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to send magic link";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      toast.error(`Failed to sign in with ${provider}`);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="animate-in fade-in zoom-in space-y-4 py-8 text-center duration-500">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Command className="text-primary h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold tracking-tight text-white">
            Check your inbox
          </h3>
          <p className="mx-auto max-w-70 text-sm text-zinc-500">
            We&apos;ve sent a magic link to{" "}
            <span className="font-medium text-white">{email}</span>. Click it to
            sign in instantly.
          </p>
        </div>
        <Button
          variant="link"
          className="text-zinc-500 hover:text-white"
          onClick={() => setSent(false)}
        >
          Try another email
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-lg border-white/10 bg-white/5 font-medium hover:bg-white/10"
          onClick={() => handleOAuthSignIn("google")}
          disabled={loading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-lg border-white/10 bg-white/5 font-medium hover:bg-white/10"
          onClick={() => handleOAuthSignIn("github")}
          disabled={loading}
        >
          <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 2.614 1.113.762-.211 1.582-.317 2.382-.321.8.004 1.62.11 2.382.321 1.606-1.435 2.606-1.113 2.606-1.113.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailSignIn} className="grid gap-3">
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="ring-offset-background focus-visible:ring-primary/50 flex h-11 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition-all placeholder:text-zinc-600 hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
            required
            disabled={loading}
          />
        </div>
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="h-11 rounded-lg font-bold shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          disabled={loading}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            "Continue with Email"
          )}
        </Button>
      </form>
    </div>
  );
}
