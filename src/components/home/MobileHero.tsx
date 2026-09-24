"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TrendingUp, ShieldCheck, Clock3 } from "lucide-react";
import { HeroBackground } from "./HeroBackground";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.09 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function MobileHero({ isGuest }: { isGuest: boolean }) {
  const router = useRouter();
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden rounded-b-xl bg-[#0a0f2e] shadow-lg shadow-blue-950/30 sm:hidden">
      {/* Sliding background images + gradient wash */}
      <HeroBackground imgClassName="opacity-45" intervalMs={6000} />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f2e]/70 via-[#0a0f2e]/50 to-[#16337a]/40" />

      {/* Ambient glow orbs */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-12 -top-12 size-44 rounded-full bg-[#3b82f6]/30 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1.25, 1, 1.25], opacity: [0.2, 0.38, 0.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-16 -left-12 size-48 rounded-full bg-[#ff8c00]/25 blur-3xl"
      />

      <div className="relative z-10 px-5 pb-7 pt-14">
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="text-[27px] font-black leading-[1.12] tracking-tight text-white"
        >
          {t("heroTitleA")}
          <br />
          <span className="bg-gradient-to-r from-[#60a5fa] via-[#38bdf8] to-[#ff8c00] bg-clip-text text-transparent">
            {t("heroTitleB")}
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="mt-2 text-xs leading-relaxed text-white/60"
        >
          {t("heroSub")}
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="mt-5 flex gap-2.5">
          <button
            onClick={() => document.getElementById("tana-games")?.scrollIntoView({ behavior: "smooth" })}
            className="flex-1 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#2563eb] py-3 text-xs font-bold tracking-wider text-white shadow-lg shadow-blue-950/50 transition active:scale-[0.97]"
          >
            {t("betNow")}
          </button>
          <button
            onClick={() => router.push(isGuest ? "/signup" : "/wallet")}
            className="flex-1 rounded-lg border border-white/20 bg-white/5 py-3 text-xs font-bold tracking-wider text-white backdrop-blur-sm transition active:scale-[0.97]"
          >
            {isGuest ? t("joinNow") : t("depositBtn")}
          </button>
        </motion.div>

        {/* Trust chips */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-5 grid grid-cols-3 gap-2">
          {[
            { icon: TrendingUp, labelKey: "bestOdds" },
            { icon: Clock3, labelKey: "live247" },
            { icon: ShieldCheck, labelKey: "fastPayouts" },
          ].map((f) => (
            <div
              key={f.labelKey}
              className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-2.5 backdrop-blur-sm"
            >
              <f.icon className="size-4 text-[#60a5fa]" />
              <span className="text-[9px] font-semibold tracking-wide text-white/70">{t(f.labelKey).toUpperCase()}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
