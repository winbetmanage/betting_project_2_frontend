"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { getRefreshToken, clearSession } from "@/lib/auth";

export default function SignOutButton() {
  const t = useTranslations("nav");
  const router = useRouter();

  const signOut = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      api.post("/auth/logout", { refreshToken }).catch(() => {});
    }
    clearSession();
    router.replace("/login");
    router.refresh();
  };

  return (
    <button
      onClick={signOut}
      className="rounded-md border border-white/15 px-4 py-2 text-sm hover:bg-white/10 transition-colors"
    >
      {t("signOut")}
    </button>
  );
}