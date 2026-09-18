"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const HERO_IMAGES = Array.from({ length: 14 }, (_, i) => `/assets/hero_images/${i + 1}.jpg`);

type HeroBackgroundProps = {
  images?: string[];
  intervalMs?: number;
  className?: string;
  imgClassName?: string;
  showArrows?: boolean;
  showDots?: boolean;
  pauseOnHover?: boolean;
};

/**
 * Full-bleed sliding background: crossfading images with a slow Ken Burns
 * zoom. Renders only the outgoing + incoming frames so 14 images never sit
 * in the DOM at once. Foreground content is rendered by the parent on top.
 */
export function HeroBackground({
  images = HERO_IMAGES,
  intervalMs = 6000,
  className,
  imgClassName,
  showArrows = false,
  showDots = false,
  pauseOnHover = true,
}: HeroBackgroundProps) {
  const [[index, dir], setIndex] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);
  const count = images.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => setIndex(([p]) => [(p + 1) % count, 1]), intervalMs);
    return () => clearInterval(t);
  }, [count, intervalMs, paused]);

  // Warm the next frame so the crossfade never flashes empty
  useEffect(() => {
    if (count < 2 || typeof Image === "undefined") return;
    const next = new Image();
    next.src = images[(index + 1) % count];
  }, [index, images, count]);

  if (count === 0) return null;

  const go = (d: number) => setIndex(([p]) => [(p + d + count) % count, d]);

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden", className)}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-hidden
    >
      <AnimatePresence initial={false} custom={dir}>
        <motion.img
          key={images[index]}
          src={images[index]}
          alt=""
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.1, ease: "easeInOut" }, scale: { duration: intervalMs / 1000 + 1.2, ease: "linear" } }}
          className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
          draggable={false}
        />
      </AnimatePresence>

      {showArrows && count > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous background"
            className="absolute left-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next background"
            className="absolute right-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}

      {showDots && count > 1 && (
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setIndex([i, i > index ? 1 : -1])}
              aria-label={`Background ${i + 1}`}
              className={cn("h-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-white" : "w-1.5 bg-white/40")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
