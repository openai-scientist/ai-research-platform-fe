import { notFound } from "next/navigation";

import { runSections } from "@/lib/research-workspace";

import { ExperimentPage } from "../../../../_components/experiment-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; runId: string; section?: string[] }>;
}) {
  const { projectId, runId, section } = await params;
  const selected = runSections.find((item) => item.value === section?.[0]);
  if (section && (section.length !== 1 || !selected)) notFound();
  return <ExperimentPage projectId={projectId} runId={runId} section={selected?.value} />;
}
