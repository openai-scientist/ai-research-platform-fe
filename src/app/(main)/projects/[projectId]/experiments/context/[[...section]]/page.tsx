import { notFound } from "next/navigation";

import { ExperimentPage } from "../../../_components/experiment-page";

export default async function Page({ params }: { params: Promise<{ projectId: string; section?: string[] }> }) {
  const { projectId, section } = await params;
  if (section && (section.length !== 1 || section[0] !== "history")) notFound();
  return <ExperimentPage projectId={projectId} section={section ? "history" : "current"} />;
}
