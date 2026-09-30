"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";

/**
 * Asks a guest to sign in or create an account. Betting actions and
 * wallet/account pages render this instead of bouncing the visitor away,
 * so guests can keep browsing games freely.
 */
export function SignInPromptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("nav");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="size-5 text-primary" /> {t("signinRequiredTitle")}
          </DialogTitle>
          <DialogDescription>{t("signinRequiredBody")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
            <LogIn className="size-4" /> {t("login")}
          </Button>
          <Button render={<Link href="/signup" />} nativeButton={false}>
            <UserPlus className="size-4" /> {t("signup")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Full-page variant for wallet/account pages visited by guests. */
export function SignInPromptCard() {
  const t = useTranslations("nav");
  return (
    <div className="mx-auto w-full max-w-md py-10 text-center">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
          <LogIn className="size-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">{t("signinRequiredTitle")}</h1>
        <p className="mt-1 text-sm text-white/60">{t("signinRequiredBody")}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" render={<Link href="/login" />} nativeButton={false} className="border-white/15">
            <LogIn className="size-4" /> {t("login")}
          </Button>
          <Button render={<Link href="/signup" />} nativeButton={false}>
            <UserPlus className="size-4" /> {t("signup")}
          </Button>
        </div>
      </div>
    </div>
  );
}
