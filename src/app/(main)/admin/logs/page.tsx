import type { Metadata } from "next";

import { PatientMonitoringScreen } from "../../dashboard/patient-monitoring/_components/patient-monitoring-screen";

export const metadata: Metadata = {
  title: "ResearchLab AI Log Monitoring",
  description: "ResearchLab AI log monitoring.",
};

export default function Page() {
  return <PatientMonitoringScreen mode="logs" title="RESEARCHLAB AI LOG MONITORING" />;
}
