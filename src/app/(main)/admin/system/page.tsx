import type { Metadata } from "next";

import { SystemHealth } from "./_components/system-health";

export const metadata: Metadata = {
  title: "System Health · OpenAI Scientist",
  description: "Monitor OpenAI Scientist services, runtime metrics, and incidents.",
};

export default function Page() {
  return <SystemHealth />;
}
