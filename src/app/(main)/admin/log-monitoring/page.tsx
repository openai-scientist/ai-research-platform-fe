import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { MonitoringScreen } from "./_components/monitoring-screen";

export const metadata: Metadata = {
  title: `Log monitoring · ${APP_CONFIG.name}`,
  description: "Monitor service health, measured request telemetry, and technical events.",
};

export default function Page() {
  return <MonitoringScreen />;
}
