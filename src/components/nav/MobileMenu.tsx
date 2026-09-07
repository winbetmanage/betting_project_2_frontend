"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SignOutButton from "@/components/auth/SignOutButton";
import { api } from "@/lib/api";
import { Menu, X, UserCircle, Wallet, Home, Gamepad2, ChevronRight, Trophy, Ticket } from "lucide-react";

type Sport = { id: string; name: string; gameType: string };
type MobileMenuProps = {
  user: { name: string | null; email: string } | null;
  role: string | null;
  authed: boolean;
  balance: number | null;
};

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/my-bets", label: "My Bets", icon: Ticket },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

// Drawer spring physics — snappy open, smooth close + staggered children
import type { Variants } from "framer-motion";

const drawerVariants: Variants = {
  closed: {
    x: "-100%",
    transition: { type: "spring", stiffness: 420, damping: 44, when: "afterChildren", staggerChildren: 0.02, staggerDirection: -1 },
  },
  open: { x: 0, transition: { type: "spring", stiffness: 420, damping: 38, staggerChildren: 0.045, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  closed: { opacity: 0, x: -28, transition: { duration: 0.15 } },
  open: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 520, damping: 40 } },
};

export default function MobileMenu({ user, role, authed, balance }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    api
      .get<{ data: Sport[] }>("/sports")
      .then((r) => setSports((r.data ?? []).slice(0, 12)))
      .catch(() => setSports([]));
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const selectSport = (name: string) => {
    window.dispatchEvent(new CustomEvent("tana:sport-select", { detail: name }));
    setOpen(false);
    if (pathname !== "/") router.push("/");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              key="drawer"
              initial="closed"
              animate="open"
              exit="closed"
              variants={drawerVariants}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.6, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70 || info.velocity.x < -450) setOpen(false);
              }}
              className="fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col bg-[#0a0f2e] text-white shadow-2xl shadow-black/50 md:hidden"
            >
              {/* Grab handle hint */}
              <div className="absolute right-2.5 top-1/2 hidden h-14 w-1 -translate-y-1/2 rounded-full bg-white/15" aria-hidden />

              {/* Header */}
              <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <Link href="/" className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/website_images/logoone.png"
                    alt="Tana Betting"
                    className="h-7 w-auto object-contain brightness-110"
                  />
                  <span className="text-sm font-black tracking-wide">TANA BETTING</span>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10"
                >
                  <X className="size-5" />
                </button>
              </motion.div>

              {/* User chip */}
              {authed ? (
                <motion.div variants={itemVariants} className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  <div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                    {user?.email?.[0]?.toUpperCase() ?? "T"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user?.name || user?.email}</p>
                    <p className="text-xs text-secondary">{balance !== null ? `ETB ${balance.toFixed(2)}` : "—"}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="flex gap-2 border-b border-white/10 px-4 py-3">
                  <Link
                    href="/login"
                    className="flex-1 rounded-md border border-white/15 px-3 py-2 text-center text-xs font-medium text-white/80 hover:bg-white/10"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-xs font-semibold text-white"
                  >
                    Sign up
                  </Link>
                </motion.div>
              )}

              {/* Nav links */}
              <nav className="px-3 py-2">
                {links.map((l) => {
                  const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
                  return (
                    <motion.div key={l.href} variants={itemVariants}>
                      <Link
                        href={l.href}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                          active ? "bg-white text-[#0a0f2e]" : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <l.icon className={`size-4 transition-transform duration-200 group-hover:scale-110 ${active ? "text-[#0a0f2e]" : ""}`} />
                        {l.label}
                        <ChevronRight className={`ml-auto size-4 transition-transform duration-200 group-hover:translate-x-0.5 ${active ? "opacity-60" : "opacity-40"}`} />
                      </Link>
                    </motion.div>
                  );
                })}
                {authed && (
                  <motion.div variants={itemVariants}>
                    <Link
                      href="/profile"
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
                    >
                      <UserCircle className="size-4 transition-transform duration-200 group-hover:scale-110" />
                      My Profile
                      <ChevronRight className="ml-auto size-4 opacity-40 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </motion.div>
                )}
                {role === "ADMIN" && (
                  <motion.div variants={itemVariants}>
                    <Link
                      href="/admin"
                      className="mt-1 flex items-center gap-3 rounded-lg border border-primary/40 px-3 py-2.5 text-sm font-medium text-primary-light transition hover:bg-primary/10"
                    >
                      <Trophy className="size-4" />
                      Admin Dashboard
                    </Link>
                  </motion.div>
                )}
              </nav>

              {/* Sports list */}
              <motion.div variants={itemVariants} className="flex-1 overflow-y-auto border-t border-white/10 px-3 py-2">
                <p className="px-3 py-1 text-[10px] font-bold tracking-widest text-white/40">SPORTS</p>
                {sports.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSport(s.name)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                  >
                    <Trophy className="size-4 text-white/40" />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </motion.div>

              {/* Footer */}
              {authed && (
                <motion.div variants={itemVariants} className="border-t border-white/10 px-4 py-3">
                  <SignOutButton />
                </motion.div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}