import type { Metadata } from "next";

import { AdminAuditScreen } from "./_components/admin-audit-screen";

export const metadata: Metadata = {
  title: "Audit log · OpenAI Scientist",
  description: "Review recorded platform actions.",
};
export default function Page() {
  return <AdminAuditScreen />;
}
