import type { Metadata } from "next";

import { AdminUsage } from "../_components/operations-pages";

export const metadata: Metadata = {
  title: "Usage & Cost · ResearchLab AI",
  description: "Track ResearchLab AI token usage, requests, agent runs, and cost.",
};

export default function Page() {
  return <AdminUsage />;
}
