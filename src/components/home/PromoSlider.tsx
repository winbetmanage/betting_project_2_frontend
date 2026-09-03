"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  {
    id: 1,
    title: "GET THE BEST ODDS ON TOP GAMES",
    subtitle: "Live odds • 24/7 • Trusted by thousands",
    badge: "Up to 100% Bonus",
    gradient: "from-[#0a0f2e] via-[#0a0f2e]/80 to-transparent",
  },
  {
    id: 2,
    title: "BET ON PREMIER LEAGUE",
    subtitle: "Exclusive markets & competitive odds",
    badge: "Best Prices",
    gradient: "from-[#1a0540] via-[#1a0540]/80 to-transparent",
  },
  {
    id: 3,
    title: "WELCOME BONUS AVAILABLE",
    subtitle: "Sign up today and claim your bonus",
    badge: "New Players",
    gradient: "from-[#0a1f3e] via-[#0a1f3e]/80 to-transparent",
  },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export default function PromoSlider() {
  const [[page, dir], setPage] = useState([0, 0]);
  const index = page % slides.length;

  const paginate = useCallback(
    (newDir: number) => setPage(([p]) => [p + newDir, newDir]),
    []
  );

  useEffect(() => {
    const t = setInterval(() => paginate(1), 5000);
    return () => clearInterval(t);
  }, [paginate]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0a0f2e]">
      <AnimatePresence initial={false} custom={dir} mode="wait">
        <motion.div
          key={slides[index].id}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="relative"
        >
          <div className={`absolute inset-0 bg-gradient-to-r ${slides[index].gradient} z-10`} />
          <img
            src="/assets/website_images/bgimage.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="relative z-20 flex items-center justify-between p-4 sm:p-6 min-h-[120px]">
            <div>
              <p className="text-xs font-bold tracking-widest text-[#ff8c00]">
                {slides[index].title}
              </p>
              <p className="mt-1 text-xs text-white/60 hidden sm:block">
                {slides[index].subtitle}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                {slides[index].badge}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setPage([i, i > index ? 1 : -1])}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-5 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}