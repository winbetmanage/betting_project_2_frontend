"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Home, Trophy } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0a0f2e] px-4 text-white">
      {/* glow orbs */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-[#ff8c00]/15 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/website_images/logoone.png"
          alt="Tana Betting"
          className="h-14 w-auto rounded-2xl bg-white object-contain p-2 shadow-xl"
        />
        <div className="mt-6 bg-gradient-to-r from-[#60a5fa] via-[#38bdf8] to-[#ff8c00] bg-clip-text text-[96px] font-black leading-none tracking-tight text-transparent sm:text-[140px]">
          404
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Trophy className="size-5 text-[#f59e0b]" />
          {t("notFoundTitle")}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">{t("notFoundSub")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90 active:scale-[0.98]"
        >
          <Home className="size-4" />
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
