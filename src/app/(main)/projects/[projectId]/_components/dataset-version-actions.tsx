"use client";

import { useState } from "react";

import { Download, Eye, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type DatasetVersionItem, fetchDatasets } from "@/lib/api/services/fetch-datasets";

import { DatasetCsvPreview } from "./dataset-csv-preview";

export function DatasetVersionActions({
  projectId,
  datasetId,
  version,
}: {
  projectId: string;
  datasetId: string;
  version: DatasetVersionItem;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for version ${version.version_number}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (previewOpen) event.preventDefault();
          }}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setPreviewOpen(true)}>
              <Eye />
              Preview CSV
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={fetchDatasets.getVersionDownloadUrl(projectId, datasetId, version.id)}>
                <Download />
                Download CSV
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DatasetCsvPreview
        projectId={projectId}
        datasetId={datasetId}
        version={version}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        showTrigger={false}
      />
    </>
  );
}
