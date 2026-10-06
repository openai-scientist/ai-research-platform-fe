import type { Metadata } from "next";

import { AdminUsers } from "./_components/admin-users";

export const metadata: Metadata = {
  title: "Users · ResearchLab AI",
  description: "Manage the fixed ResearchLab AI system accounts and their activity.",
};

export default function Page() {
  return <AdminUsers />;
}
