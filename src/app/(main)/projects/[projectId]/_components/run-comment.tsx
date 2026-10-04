"use client";

import { FileText, Pencil, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CommentItem } from "@/lib/api/services/fetch-comments";
import { getInitials } from "@/lib/utils";

export function RunComment({
  comment,
  filename,
  own,
  canEdit,
  canDelete,
  deleting,
  onEdit,
  onDelete,
}: {
  comment: CommentItem;
  filename?: string;
  own: boolean;
  canEdit: boolean;
  canDelete: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => unknown;
}) {
  const author = comment.author_display_name?.trim() || "Project member";
  const createdAt = new Date(comment.created_at);

  return (
    <article className="flex min-w-0 gap-3 py-5">
      <Avatar aria-hidden="true">
        <AvatarFallback>{getInitials(author).slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="max-w-full break-words font-medium text-sm">{author}</span>
              {own && <Badge variant="secondary">You</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
              <time dateTime={comment.created_at} title={createdAt.toLocaleString("en-GB")}>
                {createdAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              {comment.edited_at && <span title={new Date(comment.edited_at).toLocaleString("en-GB")}>· Edited</span>}
            </div>
          </div>
          {(canEdit || canDelete) && (
            <div className="flex shrink-0 items-center gap-1">
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Edit comment" onClick={onEdit}>
                      <Pencil aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit comment</TooltipContent>
                </Tooltip>
              )}
              {canDelete && (
                <Tooltip>
                  <ConfirmDialog
                    title="Delete comment?"
                    description="Remove this comment from the discussion."
                    confirmLabel="Delete comment"
                    onConfirm={() => void onDelete()}
                    trigger={
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete comment"
                          disabled={deleting}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                    }
                  />
                  <TooltipContent>Delete comment</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
        {comment.artifact_id && (
          <Badge variant="outline" className="h-auto max-w-full self-start whitespace-normal text-left">
            <FileText aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 break-all">{filename ?? "Attached artifact"}</span>
          </Badge>
        )}
        {comment.deleted ? (
          <p className="text-muted-foreground text-sm">Comment deleted</p>
        ) : (
          <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-6">{comment.body}</p>
        )}
      </div>
    </article>
  );
}
