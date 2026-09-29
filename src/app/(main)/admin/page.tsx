import type { Metadata } from "next";

import { AdminOverview } from "./_components/overview";

export const metadata: Metadata = {
  title: "Admin Overview · ResearchLab AI",
  description: "Operational overview for the ResearchLab AI experimentation platform.",
};

export default function Page() {
  return <AdminOverview />;
}
