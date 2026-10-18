"use client";

import { useRouter } from "next/navigation";

import { useConnectionActions } from "@/hooks/use-data-connections";

import type { WorkspaceProps } from "../workspace-ui";
import { ConnectionFlow } from "./connection-flow";
import type { GoogleSelectionResult } from "./google-connection-selection";

/**
 * Import from a spreadsheet or folder just picked with Google. One added only for this import is removed again
 * when the flow closes without importing, so the project lists only the files it imported from.
 */
export function PickedImportFlow({
  project,
  canWrite,
  picked,
  backLabel,
  onClose,
}: Pick<WorkspaceProps, "project" | "canWrite"> & {
  picked: GoogleSelectionResult;
  backLabel: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const actions = useConnectionActions(project.id);

  return (
    <ConnectionFlow
      key={picked.connection.id}
      project={project}
      initialConnection={picked.connection}
      canWrite={canWrite}
      backLabel={backLabel}
      onClose={() => {
        if (!picked.reused) actions.remove.mutate(picked.connection.id);
        onClose();
      }}
      onComplete={(dataset) => {
        onClose();
        router.push(`/projects/${project.id}/datasets/${dataset.id}`);
      }}
    />
  );
}
