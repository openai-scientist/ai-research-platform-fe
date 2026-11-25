import type { Metadata } from "next";

import { AdminProjectsScreen } from "./_components/admin-projects-screen";

export const metadata: Metadata = {
  title: "Projects · OpenAI Scientist",
  description: "Usage metadata of every OpenAI Scientist project.",
};

export default function Page() {
  return <AdminProjectsScreen />;
}
