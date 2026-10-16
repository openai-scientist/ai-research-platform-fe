import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { AdminOverview } from "./_components/overview";

export const metadata: Metadata = {
  title: `Admin Overview · ${APP_CONFIG.name}`,
  description: `Operational overview for ${APP_CONFIG.name}.`,
};

export default function Page() {
  return <AdminOverview />;
}
