"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { api } from "@/lib/api";
import { isAuthenticated, setSession, type AuthUser } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

function UserIcon() {
  return (
    <svg className="size-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}
//commnet
function EmailIcon() {
  return (
    <svg className="size-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="size-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [refName, setRefName] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) router.replace("/");
    // Capture referral code from the link (/signup?ref=<code>)
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && ref.trim()) setRefCode(ref.trim());
  }, [router]);

  useEffect(() => {
    if (!refCode) {
      setRefName(null);
      return;
    }
    let cancelled = false;
    api
      .get<{ data: { found: boolean; name?: string } }>(`/auth/referral?ref=${encodeURIComponent(refCode)}`)
      .then((r) => {
        if (cancelled) return;
        setRefName(r.data?.found ? r.data.name ?? "A friend" : null);
      })
      .catch(() => {
        if (!cancelled) setRefName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [refCode]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{
        data: { accessToken: string; refreshToken: string; user: AuthUser };
      }>("/auth/register", { name, email, password, ...(refCode ? { referralCode: refCode } : {}) });
      setSession(res.data.accessToken, res.data.refreshToken, res.data.user);
      toast.success(`Welcome, ${res.data.user.name ?? res.data.user.email}! Account created.`);
      router.replace("/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("createAccount")}
      subtitle={t("signupSubtitle")}
      tagline="Instant sign-up · No hidden fees"
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
          <label className="text-sm font-medium text-white/80" htmlFor="name">
            {t("name")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
              <UserIcon />
            </span>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-white/35 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/80" htmlFor="email">
            {t("email")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
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
            {t("password")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
              <LockIcon />
            </span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-white/35 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {refCode && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-xs text-primary-light">
            {refName ? (
              <>
                {t("referredBy")} <span className="font-bold">{refName}</span>.
              </>
            ) : (
              <>{t("referralCode")} <span className="font-bold">{refCode}</span> {t("badRefCode")}</>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t("signingUp") : t("createAccount")}
        </button>

        <p className="text-center text-sm text-white/60">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-primary-light underline-offset-4 hover:underline">
            {t("signin")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}