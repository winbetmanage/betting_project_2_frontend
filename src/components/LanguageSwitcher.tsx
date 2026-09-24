"use client";

import { Globe, Check } from "lucide-react";
import { useLocale, type Locale } from "@/i18n/LocaleProvider";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "am", label: "አማርኛ" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useTranslations("nav");
  const active = OPTIONS.find((o) => o.value === locale) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white ${className}`}
            aria-label={t("language")}
          >
            <Globe className="size-3.5" />
            <span>{active.value === "am" ? "አማ" : "en"}</span>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => setLocale(o.value)}
            className={o.value === locale ? "bg-primary/10 text-primary" : ""}
          >
            <span className="flex-1">{o.label}</span>
            {o.value === locale && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
