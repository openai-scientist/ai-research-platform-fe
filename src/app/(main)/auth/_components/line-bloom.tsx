"use client";

import { useEffect, useRef } from "react";

import { cn } from "cn";

/**
 * A four-pointed bloom of fine contour lines that slowly bends and folds over itself.
 * Animation: "Particles" from LottieFiles (Lottie Simple License), trimmed and painted
 * here in the text colour, so it follows every theme preset.
 */
export function LineBloom({ className }: { className?: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    // Loaded on demand so the player and the animation stay out of every other page's bundle.
    void Promise.all([import("lottie-web/build/player/lottie_light"), import("./line-bloom.json")]).then(
      ([{ default: lottie }, { default: animationData }]) => {
        if (cancelled) return;
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const animation = lottie.loadAnimation({
          container: element,
          renderer: "svg",
          loop: true,
          autoplay: !still,
          animationData,
        });
        if (still) animation.goToAndStop(120, true);
        destroy = () => animation.destroy();
      },
    );
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return (
    <div
      ref={container}
      aria-hidden="true"
      className={cn(
        // Paint every fill and stroke in the current text colour, whatever the file used.
        "[&_[fill]:not([fill=none])]:fill-current [&_[stroke]:not([stroke=none])]:stroke-current",
        className,
      )}
    />
  );
}
