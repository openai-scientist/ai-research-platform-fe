import type { Metadata } from "next";

import { AdminOverview } from "./_components/overview";

export const metadata: Metadata = {
  title: "Admin Overview · OpenAI Scientist",
  description: "Operational overview for OpenAI Scientist.",
};

export default function Page() {
  return <AdminOverview />;
}
