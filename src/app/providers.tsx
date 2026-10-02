"use client";

import type { ReactNode } from "react";

import { Providers as AppProviders } from "@/lib/providers";

export default function Providers({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
