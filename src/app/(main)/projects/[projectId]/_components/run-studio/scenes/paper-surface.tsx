import type { ReactNode } from "react";

export function PaperSurface({ children }: { children: ReactNode }) {
  return (
    <article
      data-page
      className="relative min-w-0 rounded-xl bg-card px-5 pt-7 pb-10 font-serif text-[15.5px] text-card-foreground leading-[1.72] ring-1 ring-foreground/10 sm:px-12 sm:pt-10"
    >
      {children}
    </article>
  );
}
