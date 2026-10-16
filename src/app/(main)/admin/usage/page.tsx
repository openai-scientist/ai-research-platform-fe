import type { Metadata } from "next";

import { AdminUsageScreen } from "./_components/admin-usage-screen";

export const metadata: Metadata = {
  title: "Usage & Cost · OpenAI Scientist",
  description: "Review run costs and budgets by project.",
};
export default function Page() {
  return <AdminUsageScreen />;
}
