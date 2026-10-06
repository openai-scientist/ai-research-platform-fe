"use client";

import { type ReactNode, useEffect, useRef } from "react";

import Link from "next/link";

export function NotificationToastLink({
  href,
  text,
  onOpen,
  children,
}: {
  href: string;
  text: string;
  onOpen: () => void;
  children?: ReactNode;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const element = linkRef.current?.closest<HTMLElement>("[data-sonner-toast]");
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    // Use elapsed wall time: embedded browsers can freeze CSS animation timelines.
    const animate = (exiting: boolean) => {
      clearInterval(timer);
      const startedAt = Date.now();
      const duration = exiting ? 180 : 240;
      const update = () => {
        const progress = Math.min(1, (Date.now() - startedAt) / duration);
        const eased = 1 - (1 - progress) ** 4;
        const offset = exiting ? eased * 6 : (1 - eased) * 8;
        const opacity = exiting ? 1 - eased : 0.8 + eased * 0.2;
        element.style.setProperty("--notification-toast-offset", `${offset}px`);
        element.style.setProperty("--notification-toast-opacity", `${opacity}`);
        if (progress === 1) clearInterval(timer);
      };
      update();
      timer = setInterval(update, 16);
    };
    animate(false);
    const observer = new MutationObserver(() => {
      if (element.dataset.removed === "true") animate(true);
    });
    observer.observe(element, { attributes: true, attributeFilter: ["data-removed"] });
    return () => {
      clearInterval(timer);
      observer.disconnect();
      element.style.removeProperty("--notification-toast-offset");
      element.style.removeProperty("--notification-toast-opacity");
    };
  }, []);

  return (
    <Link
      ref={linkRef}
      href={href}
      prefetch={false}
      aria-label={text}
      className="outline-none after:absolute after:inset-0 after:cursor-pointer after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring"
      onClick={onOpen}
    >
      {children}
    </Link>
  );
}
