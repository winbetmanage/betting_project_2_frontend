import type { ReactNode } from "react";

export default function AuthShell({
  title,
  subtitle,
  tagline,
  children,
}: {
  title: string;
  subtitle: string;
  tagline?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-brand-dark px-4 py-10 text-white">
      {/* Background image with overlays */}
      <div aria-hidden className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/website_images/bgimage.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        {/* Dark overlay for readability + brand gradient (lighter navy) */}
        <div className="absolute inset-0 bg-brand-dark/70" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-brand-dark/30 to-brand-dark/80" />
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      {/* Decorative blurs keep brand feel */}
      <div aria-hidden className="pointer-events-none absolute -top-44 -left-44 h-[30rem] w-[30rem] rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-52 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/15 blur-3xl" />

      <div className="relative mb-8 w-full max-w-sm text-center">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/website_images/logoone.png"
          alt="Tana Betting"
          className="mx-auto mb-4 h-16 w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
        />
        <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-primary-light/90">TANA BETTING</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-white/65">{subtitle}</p>
        {tagline && (
          <span className="mt-4 inline-block rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-medium text-primary-light backdrop-blur">
            {tagline}
          </span>
        )}
      </div>

      <div className="relative w-full max-w-sm">{children}</div>

      <p className="relative mt-8 text-xs text-white/45">
        © {new Date().getFullYear()} Tana Betting · Play responsibly
      </p>
    </div>
  );
}
