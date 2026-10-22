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
  // Where the pointer went down, so a swipe that ends on the link doesn't open it.
  const downAt = useRef<{ x: number; y: number } | null>(null);

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
        // Toasts at the bottom rise into place and sink away; those at the top do the reverse.
        const away = element.dataset.yPosition === "bottom" ? -1 : 1;
        const offset = away * (exiting ? -eased * 6 : -(1 - eased) * 8);
        const opacity = exiting ? 1 - eased : 0.8 + eased * 0.2;
        element.style.setProperty("--notification-toast-offset", `${offset}px`);
        element.style.setProperty("--notification-toast-opacity", `${opacity}`);
        if (progress === 1) clearInterval(timer);
      };
      update();
      timer = setInterval(update, 16);
    };
    // A swipe too short to dismiss: Sonner drops the offset at once, so ease it back.
    let swiped = { x: 0, y: 0 };
    let back: ReturnType<typeof setInterval> | undefined;
    const settle = (from: { x: number; y: number }) => {
      clearInterval(back);
      const startedAt = Date.now();
      const update = () => {
        const left = (1 - Math.min(1, (Date.now() - startedAt) / 200)) ** 3;
        element.style.setProperty("--notification-toast-x", `${from.x * left}px`);
        element.style.setProperty("--notification-toast-y", `${from.y * left}px`);
        if (left === 0) clearInterval(back);
      };
      update();
      back = setInterval(update, 16);
    };
    animate(false);
    const observer = new MutationObserver((records) => {
      if (records.some((r) => r.attributeName === "data-removed") && element.dataset.removed === "true") animate(true);
      const amount = (axis: string) => Number.parseFloat(element.style.getPropertyValue(`--swipe-amount-${axis}`)) || 0;
      const now = { x: amount("x"), y: amount("y") };
      const released = !now.x && !now.y && (swiped.x || swiped.y);
      if (released && element.dataset.removed !== "true") settle(swiped);
      swiped = now;
    });
    observer.observe(element, { attributes: true, attributeFilter: ["data-removed", "style"] });
    return () => {
      clearInterval(timer);
      clearInterval(back);
      observer.disconnect();
      element.style.removeProperty("--notification-toast-offset");
      element.style.removeProperty("--notification-toast-opacity");
      element.style.removeProperty("--notification-toast-x");
      element.style.removeProperty("--notification-toast-y");
    };
  }, []);

  return (
    <Link
      ref={linkRef}
      href={href}
      prefetch={false}
      aria-label={text}
      // A native link drag would cancel Sonner's swipe to dismiss.
      draggable={false}
      className="outline-none after:absolute after:inset-0 after:cursor-pointer after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring"
      onPointerDown={(event) => {
        downAt.current = { x: event.clientX, y: event.clientY };
      }}
      onClick={(event) => {
        const start = downAt.current;
        downAt.current = null;
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) {
          event.preventDefault();
          return;
        }
        onOpen();
      }}
    >
      {children}
    </Link>
  );
}
