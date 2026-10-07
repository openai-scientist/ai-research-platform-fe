"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUploadProjectFileMutation } from "@/hooks/use-project-files-query";

import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { perform } from "./workspace-ui";

export function UploadProjectFileDialog({ projectId, canUpload }: { projectId: string; canUpload: boolean }) {
  const upload = useUploadProjectFileMutation(projectId);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  return (
    <WorkspaceFormDialog
      title="Upload document"
      description="Attach a reference document. To use data in a research run, upload a dataset instead."
      triggerVariant="default"
      submitLabel="Upload document"
      pending={upload.isPending}
      disabled={!canUpload}
      onOpenChange={(open) => {
        if (!open) {
          setFile(null);
          setFileKey((key) => key + 1);
        }
      }}
      onSubmit={async () => {
        if (!canUpload) return;
        if (!file) {
          toast.error("Choose a document to upload.");
          return;
        }
        if (!/\.(pdf|csv|xlsx|xls)$/i.test(file.name)) {
          toast.error("Only PDF, CSV, and Excel (.xlsx, .xls) files are supported.");
          return;
        }
        if (file.size === 0) {
          toast.error("The file is empty.");
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          toast.error("The file must be no larger than 50 MiB.");
          return;
        }
        const result = await perform(() => upload.mutateAsync(file), "Document uploaded.");
        if (result) return true;
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="project-document">Document</FieldLabel>
          <Input
            key={fileKey}
            id="project-document"
            type="file"
            accept=".pdf,.csv,.xlsx,.xls"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <FieldDescription>PDF, CSV, or Excel (.xlsx, .xls). Maximum 50 MiB per file.</FieldDescription>
        </Field>
      </FieldGroup>
    </WorkspaceFormDialog>
  );
}
