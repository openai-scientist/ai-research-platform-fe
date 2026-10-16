"use client";

import { useState } from "react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useCreateDatasetVersionMutation } from "@/hooks/use-datasets-query";
import type { DatasetItem, DatasetVersionItem } from "@/lib/api/services/fetch-datasets";

import { CsvFileInput } from "./csv-file-input";
import { DatasetCsvPreview } from "./dataset-csv-preview";
import { timeAgo } from "./dataset-format";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, perform, validateCsv } from "./workspace-ui";

/** Adds a CSV as the dataset's next version; earlier versions stay as they are. */
export function UploadVersionButton({ dataset, projectId }: { dataset: DatasetItem; projectId: string }) {
  const upload = useCreateDatasetVersionMutation(projectId, dataset.id);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const next = (dataset.latest_version?.version_number ?? 0) + 1;

  return (
    <WorkspaceFormDialog
      title="Upload new version"
      description={`Adds the file as v${next} of ${dataset.name}. Earlier versions are kept.`}
      submitLabel={`Upload as v${next}`}
      triggerLabel="Upload new version"
      triggerVariant="default"
      pending={upload.isPending}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (!validateCsv(file)) return;
        if (await perform(() => upload.mutateAsync(file), `"${dataset.name}" updated to v${next}.`)) {
          setFile(null);
          setFileKey((key) => key + 1);
          return true;
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="dataset-version-file">CSV file</FieldLabel>
          <CsvFileInput
            key={fileKey}
            id="dataset-version-file"
            file={file}
            onChange={setFile}
            disabled={upload.isPending}
          />
          <FieldDescription>UTF-8 CSV with a header row, up to 50 MiB.</FieldDescription>
        </Field>
      </FieldGroup>
    </WorkspaceFormDialog>
  );
}

/** The rows of the version being looked at: the latest one, or an older one picked in the history. */
export function DatasetPreview({
  dataset,
  projectId,
  version,
  onShowLatest,
}: {
  dataset: DatasetItem;
  projectId: string;
  version: DatasetVersionItem | null;
  onShowLatest: () => void;
}) {
  if (!version)
    return <ListState pending={false} failed={false} empty title="Dataset versions" retry={() => undefined} />;
  const older = version.id !== dataset.latest_version?.id;
  return (
    <section aria-label={`Preview of version ${version.version_number}`} className="flex min-w-0 flex-col gap-2">
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-1.5 text-sm",
          older ? "bg-amber-500/10 text-amber-900 dark:text-amber-200" : "px-0",
        )}
      >
        <span className="font-medium">
          {older ? `Viewing v${version.version_number}` : "Preview"}
          <span className="font-normal text-muted-foreground">
            {older
              ? ` · from ${timeAgo(version.created_at)} · ${version.row_count.toLocaleString("en-US")} rows`
              : ` · first 100 rows and 50 columns of v${version.version_number}`}
          </span>
        </span>
        {older && (
          <Button variant="outline" size="sm" className="ml-auto h-7" onClick={onShowLatest}>
            Back to latest (v{dataset.latest_version?.version_number})
          </Button>
        )}
      </div>
      <DatasetCsvPreview
        key={version.id}
        projectId={projectId}
        datasetId={dataset.id}
        version={version}
        inline
        note={false}
      />
    </section>
  );
}
