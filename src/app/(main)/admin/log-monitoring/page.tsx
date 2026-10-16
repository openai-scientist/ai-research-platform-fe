import type { Metadata } from "next";

import { PatientMonitoringScreen } from "@/app/(main)/dashboard/patient-monitoring/_components/patient-monitoring-screen";

export const metadata: Metadata = {
  title: "Log monitoring · OpenAI Scientist",
  description: "Explore simulated service telemetry, live log streams, and audit activity.",
};

export default function Page() {
  return <PatientMonitoringScreen mode="logs" />;
}
