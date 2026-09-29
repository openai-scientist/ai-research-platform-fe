import type { Metadata } from "next";

import { PatientMonitoringScreen } from "./_components/patient-monitoring-screen";

export const metadata: Metadata = {
  title: "Open Source Patient Monitoring Dashboard with shadcn/ui",
  description:
    "Explore an open source patient monitoring dashboard with live vital signs, ECG waveforms, patient trends, alarms, and device status.",
};

export default function Page() {
  return <PatientMonitoringScreen />;
}
