import type { Metadata } from "next";

import { AdminProjects } from "../_components/admin-projects";

export const metadata: Metadata = {
  title: "Projects · OpenAI Scientist",
  description: "Review and manage OpenAI Scientist research projects.",
};

interface PageProps {
  searchParams: Promise<{ view?: string | string[] }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { view } = await searchParams;
  return <AdminProjects activeView={view === "list" ? "list" : "grid"} />;
}
