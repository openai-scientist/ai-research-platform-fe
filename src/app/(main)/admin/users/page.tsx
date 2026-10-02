import type { Metadata } from "next";

import { AdminUsersScreen } from "./_components/admin-users-screen";

export const metadata: Metadata = {
  title: "Users · ResearchLab AI",
  description: "Manage platform accounts, status, and administrator access.",
};

export default function Page() {
  return <AdminUsersScreen />;
}
