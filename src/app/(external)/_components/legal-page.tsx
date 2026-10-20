import type { ReactNode } from "react";

import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { APP_CONFIG } from "@/config/app-config";

// Address people write to about their data or these terms.
export const LEGAL_CONTACT_EMAIL = "support@beyond8.io.vn";
export const LEGAL_UPDATED = "October 20, 2026";

export function LegalPage({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/" className="mb-10 inline-flex items-center gap-2 font-medium text-foreground">
        <BrandMark className="size-6" />
        {APP_CONFIG.name}
      </Link>
      <h1 className="font-semibold text-3xl tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground text-sm">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:font-semibold [&_h2]:text-base [&_h2]:text-foreground [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-muted-foreground text-xs">
        <span>{APP_CONFIG.copyright}</span>
        <span>{APP_CONFIG.independence}</span>
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy
        </Link>
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>
      </footer>
    </main>
  );
}
