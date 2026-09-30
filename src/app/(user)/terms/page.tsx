import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ticket,
  Trophy,
  ClipboardCheck,
  Undo2,
  Gift,
  ShieldAlert,
  HeartHandshake,
  History,
  ScrollText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Rules",
  description: "The rules of play on Tana Betting: accounts, deposits, withdrawals, bets, settlement, bonuses and fair play.",
};

/**
 * Single source of truth for every number quoted on this page.
 * TODO: replace with values read from the AppSetting table
 * (betting.max_payout, bonus.min_deposit, bonus.flat_amount,
 * bonus.percent, bonus.expiry_days, referral.bonus_amount) once a
 * public endpoint exposes them.
 */
const RULES_CONFIG = {
  minAge: 18,
  maxPayoutETB: 100_000,
  bonusThresholdETB: 300,
  bonusFlatETB: 200,
  bonusPercent: 10,
  bonusExpiryDays: 7,
  referralBonusETB: 50,
  version: "1.0",
  updated: "September 2026",
} as const;

const etb = (n: number) => `${n.toLocaleString("en-US")} ETB`;

type RuleSection = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  points: string[];
};

const SECTIONS: RuleSection[] = [
  {
    icon: ShieldCheck,
    title: "General",
    points: [
      `You must be ${RULES_CONFIG.minAge} years or older to use this platform.`,
      "One account per person. Duplicate accounts may be closed.",
      "You are responsible for keeping your login details safe. Any activity on your account is treated as yours.",
    ],
  },
  {
    icon: ArrowDownToLine,
    title: "Deposits",
    points: [
      "Deposit by transferring to one of the bank accounts listed on the deposit page, then submit your request with proof.",
      "Your balance is credited only after an admin approves the request.",
      "Requests with a wrong amount or unclear proof may be rejected.",
    ],
  },
  {
    icon: ArrowUpFromLine,
    title: "Withdrawals",
    points: [
      "Withdrawals are reviewed by an admin and paid to the payout account saved on your profile.",
      "The requested amount is held while your request is pending.",
      "Locked bonus money cannot be withdrawn.",
    ],
  },
  {
    icon: Ticket,
    title: "Placing bets",
    points: [
      "Bets are accepted at the odds shown when you place them.",
      "Bets cannot be changed or cancelled once placed.",
      "Markets can be suspended at any time.",
      "In multiple bets, all selections must win for the ticket to win.",
    ],
  },
  {
    icon: Trophy,
    title: "Maximum payout",
    points: [
      `The maximum payout on any single bet is ${etb(RULES_CONFIG.maxPayoutETB)}, regardless of stake or odds.`,
      `If the calculated payout is higher, it is reduced to ${etb(RULES_CONFIG.maxPayoutETB)}.`,
      "This limit applies to the total return, including the stake.",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Settlement",
    points: [
      "If the official source corrects a result, settlement may be corrected too.",
      "Bets placed on markets with obvious odds errors may be voided.",
    ],
  },
  {
    icon: Undo2,
    title: "Void, postponed and cancelled bets",
    points: [
      "If a match or market is cancelled, affected bets are void and the stake is returned.",
      "In multiple bets, a void selection is removed and the bet continues with the remaining selections.",
    ],
  },
  {
    icon: Gift,
    title: "Bonuses",
    points: [
      `First deposit bonus: if your first approved deposit is ${etb(RULES_CONFIG.bonusThresholdETB)} or more, you get ${etb(RULES_CONFIG.bonusFlatETB)}. If it is below ${etb(RULES_CONFIG.bonusThresholdETB)}, you get ${RULES_CONFIG.bonusPercent}% of the deposit. Given once per account.`,
      "Bonus money is locked: it can be used for betting but cannot be withdrawn.",
      `If the bonus is not used for betting within ${RULES_CONFIG.bonusExpiryDays} days, the unused bonus is removed.`,
      `Referral bonus of ${etb(RULES_CONFIG.referralBonusETB)} when a referred user qualifies.`,
      "Bonuses obtained through fake accounts or self-referrals are removed, and the accounts may be suspended.",
    ],
  },
  {
    icon: ShieldAlert,
    title: "Fair play and prohibited activity",
    points: [
      "Fraud, multiple accounts, fake deposit proofs, exploiting errors, and automated betting tools are prohibited.",
      "We may suspend accounts, void bets, and withhold payouts where rules are broken.",
    ],
  },
  {
    icon: HeartHandshake,
    title: "Responsible betting",
    points: [
      "Set your own limits and never bet more than you can afford to lose.",
      "Never chase losses.",
      "If betting stops being fun, contact us and we will close your account.",
    ],
  },
  {
    icon: History,
    title: "Changes to these rules",
    points: [
      "These rules may be updated from time to time.",
      `The current version (v${RULES_CONFIG.version}, ${RULES_CONFIG.updated}) is always shown on this page.`,
      "Continued use of the platform means you accept the current rules.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ScrollText className="size-3.5" /> Tana Betting
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Terms &amp; Rules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Version {RULES_CONFIG.version} · Updated {RULES_CONFIG.updated}. Short, plain rules of play — please read them before you bet.
        </p>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <s.icon className="size-5 shrink-0 text-primary" />
            {s.title}
          </h2>
          <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-primary">
            {s.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        By continuing to use Tana Betting you accept these rules.{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          Back to home
        </Link>
        .
      </p>
    </div>
  );
}
