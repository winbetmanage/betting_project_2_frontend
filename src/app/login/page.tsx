"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { api } from "@/lib/api";
import { isAuthenticated, setSession, getUser, getUserRole, type AuthUser } from "@/lib/auth";
import { toast } from "sonner";

function EmailIcon() {
  return (
    <svg className="size-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="size-5 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const role = getUser()?.role ?? getUserRole();
    router.replace(role === "ADMIN" ? "/admin" : role === "AGENT" ? "/agent" : "/");
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{
        data: { accessToken: string; refreshToken: string; user: AuthUser };
      }>("/auth/login", { email, password });
      setSession(res.data.accessToken, res.data.refreshToken, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name ?? res.data.user.email}!`);
      const role = res.data.user.role;
      router.replace(role === "ADMIN" ? "/admin" : role === "AGENT" ? "/agent" : "/");
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Login failed";
      const msg = /inactive/i.test(raw) ? "Your account is inactive, contact an admin." : raw;
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to keep the action going"
      tagline="Live odds · Fan favorites · 24/7"
    >
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8"
      >
        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/80" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60">
              <EmailIcon />
            </span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-white/35 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/80" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <LockIcon />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-white/35 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-sm text-white/60">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-primary-light underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}