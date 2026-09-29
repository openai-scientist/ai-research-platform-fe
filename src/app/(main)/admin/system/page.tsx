import type { Metadata } from "next";

import { AdminSystem } from "../_components/operations-pages";

export const metadata: Metadata = {
  title: "System Health · ResearchLab AI",
  description: "Monitor ResearchLab AI services, runtime metrics, and incidents.",
};

export default function Page() {
  return <AdminSystem />;
}
