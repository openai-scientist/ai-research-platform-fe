"use client";

import { useRef, useState } from "react";

import { Download, Eye, MoreVertical, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteProjectFileMutation, useDownloadProjectFileMutation } from "@/hooks/use-project-files-query";
import type { ProjectFileItem } from "@/lib/api/services/fetch-project-files";

import { saveProjectFile } from "./project-file-download";
import { perform } from "./workspace-ui";

export function ProjectFileActions({
  projectId,
  file,
  canWrite,
  onPreview,
}: {
  projectId: string;
  file: ProjectFileItem;
  canWrite: boolean;
  onPreview: (trigger: HTMLElement | null) => void;
}) {
  const download = useDownloadProjectFileMutation(projectId);
  const remove = useDeleteProjectFileMutation(projectId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previewRequested = useRef(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${file.filename}`}
            title={`Actions for ${file.filename}`}
            disabled={download.isPending || remove.isPending}
            aria-busy={download.isPending || remove.isPending}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (confirmOpen || previewRequested.current) event.preventDefault();
            previewRequested.current = false;
          }}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => {
                previewRequested.current = true;
                onPreview(triggerRef.current);
              }}
            >
              <Eye />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={download.isPending || remove.isPending}
              onSelect={async () => {
                const result = await perform(() => download.mutateAsync(file.id));
                if (!result) return;
                saveProjectFile(result, file.filename);
              }}
            >
              <Download />
              Download
            </DropdownMenuItem>
            {canWrite && (
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                <Trash2 />
                Delete document
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {canWrite && (
        <AlertDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            if (!remove.isPending) setConfirmOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete document?</AlertDialogTitle>
              <AlertDialogDescription className="break-words">
                Delete “{file.filename}” for everyone in this project? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={remove.isPending}
                aria-busy={remove.isPending}
                onClick={async (event) => {
                  event.preventDefault();
                  if (!canWrite || remove.isPending) return;
                  const result = await perform(() => remove.mutateAsync(file.id), {
                    title: "Document deleted",
                    description: file.filename,
                  });
                  if (result) setConfirmOpen(false);
                }}
              >
                {remove.isPending ? "Deleting…" : "Delete document"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
