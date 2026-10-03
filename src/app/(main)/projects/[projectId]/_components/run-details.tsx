"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useArtifactsQuery } from "@/hooks/use-artifacts-query";
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useInfiniteComments,
  useUpdateCommentMutation,
} from "@/hooks/use-comments-query";
import { useFrameReviewQuery, useSubmitFrameReviewMutation } from "@/hooks/use-frame-reviews-query";
import { useAbandonRunMutation, useRunDetailQuery, useSyncRunMutation } from "@/hooks/use-runs-query";
import { fetchArtifacts } from "@/lib/api/services/fetch-artifacts";
import type { ReviewSignal } from "@/lib/api/services/fetch-frame-reviews";
import { FrameReviewStatus, ProjectStatus, ReviewSignalKind, RunStatus } from "@/types/enums";

import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ActionRow, ConfirmAction, ListState, LoadMore, perform, type WorkspaceProps } from "./workspace-ui";

function FrameReview({ projectId, runId, canWrite }: { projectId: string; runId: string; canWrite: boolean }) {
  const review = useFrameReviewQuery(projectId, runId);
  const submit = useSubmitFrameReviewMutation(projectId, runId);
  const [note, setNote] = useState("");
  const [decisions, setDecisions] = useState<Record<string, { signal: ReviewSignalKind; value: string }>>({});
  const item = review.data?.data;
  const pending = item?.status === FrameReviewStatus.Pending;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Frame review</CardTitle>
        <CardDescription>Inspect the proposed research frame before continuing.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListState
          pending={review.isPending}
          failed={review.isError}
          empty={!item}
          title="Frame reviews"
          retry={review.refetch}
        />
        {item && (
          <WorkspaceFormDialog
            title="Frame review"
            triggerLabel={canWrite && pending ? "Review frame" : "View frame"}
            description="Inspect the proposed research frame and submit your decisions."
            submitLabel="Submit frame review"
            pending={submit.isPending}
            hideSubmit={!canWrite || !pending}
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              const signals: ReviewSignal[] = [];
              try {
                for (const [id, decision] of Object.entries(decisions)) {
                  if (!Object.hasOwn(item.request.items, id)) continue;
                  signals.push({
                    id,
                    signal: decision.signal,
                    ...(decision.signal === ReviewSignalKind.Edit
                      ? { value: JSON.parse(decision.value) as unknown }
                      : {}),
                  });
                }
              } catch {
                toast.error("Enter a valid JSON value for each edited review item.");
                return;
              }
              return Boolean(
                await perform(
                  () => submit.mutateAsync(signals.length ? { signals, note } : { approve_all: true, note }),
                  "Frame review submitted.",
                ),
              );
            }}
          >
            <FieldGroup>
              {Object.entries(item.request.items).map(([id, value], index) => {
                const decision = decisions[id];
                return (
                  <Field key={id}>
                    <FieldLabel htmlFor={`review-decision-${index}`}>{id}</FieldLabel>
                    <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                    {canWrite && pending && (
                      <Select
                        value={decision?.signal ?? ReviewSignalKind.Approve}
                        onValueChange={(signal) =>
                          setDecisions((current) => ({
                            ...current,
                            [id]: {
                              signal: signal as ReviewSignalKind,
                              value: current[id]?.value ?? JSON.stringify(value, null, 2),
                            },
                          }))
                        }
                      >
                        <SelectTrigger id={`review-decision-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={ReviewSignalKind.Approve}>Approve</SelectItem>
                            <SelectItem value={ReviewSignalKind.Edit}>Edit</SelectItem>
                            <SelectItem value={ReviewSignalKind.Reject}>Reject</SelectItem>
                            <SelectItem value={ReviewSignalKind.Unknown}>Unknown</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                    {decision?.signal === ReviewSignalKind.Edit && (
                      <Textarea
                        aria-label={`Edited JSON value for ${id}`}
                        value={decision.value}
                        onChange={(event) =>
                          setDecisions((current) => ({
                            ...current,
                            [id]: { ...decision, value: event.target.value },
                          }))
                        }
                      />
                    )}
                  </Field>
                );
              })}
              <Field>
                <FieldLabel htmlFor="frame-note">Review note</FieldLabel>
                <Textarea
                  id="frame-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={!canWrite || !pending}
                />
              </Field>
            </FieldGroup>
          </WorkspaceFormDialog>
        )}
      </CardContent>
    </Card>
  );
}

export function RunDetails({ project, canWrite, canManage, userId, runId }: WorkspaceProps & { runId: string }) {
  const query = useRunDetailQuery(project.id, runId);
  const sync = useSyncRunMutation(project.id, runId);
  const abandon = useAbandonRunMutation(project.id, runId);
  const artifacts = useArtifactsQuery(project.id, runId);
  const comments = useInfiniteComments(project.id, runId);
  const createComment = useCreateCommentMutation(project.id, runId);
  const editComment = useUpdateCommentMutation(project.id, runId);
  const deleteComment = useDeleteCommentMutation(project.id, runId);
  const [body, setBody] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const run = query.data?.data;
  const active = run && [RunStatus.Queued, RunStatus.Running, RunStatus.AwaitingReview].includes(run.status);
  const archived = project.status === ProjectStatus.Archived;
  useEffect(() => {
    if (run?.failure_message) toast.error(run.failure_message, { id: `run-failure:${run.id}` });
  }, [run?.id, run?.failure_message]);
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Run {runId.slice(0, 8)}</CardTitle>
          <CardDescription>Use Sync run to retrieve the latest progress from the research engine.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListState
            pending={query.isPending}
            failed={query.isError}
            empty={!run}
            title="Run details"
            retry={query.refetch}
          />
          {run && (
            <>
              <ManagementStatusBadge status={run.status} />
              <p className="text-sm">
                Dataset v{run.dataset_version_number} · Context v{run.research_context_version} · ${run.cost_usd} of $
                {run.budget_usd}
              </p>
              <ActionRow>
                {canWrite && active && (
                  <Button
                    variant="outline"
                    disabled={sync.isPending || abandon.isPending}
                    onClick={() => void perform(() => sync.mutateAsync(), "Run synchronized.")}
                  >
                    Sync run
                  </Button>
                )}
                {canManage && active && (
                  <ConfirmAction
                    title="Abandon run"
                    disabled={sync.isPending || abandon.isPending}
                    description="Stop this research run. This action cannot be undone."
                    onConfirm={() => perform(() => abandon.mutateAsync(), "Run abandoned.")}
                  />
                )}
              </ActionRow>
            </>
          )}
        </CardContent>
      </Card>
      {run?.status === RunStatus.AwaitingReview && (
        <FrameReview key={run.updated_at} projectId={project.id} runId={runId} canWrite={canWrite} />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Artifacts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ListState
            pending={artifacts.isPending}
            failed={artifacts.isError}
            empty={!artifacts.data?.data.length}
            title="Artifacts"
            retry={artifacts.refetch}
          />
          {artifacts.data?.data.map((artifact) => (
            <div key={artifact.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-all text-sm">{artifact.filename}</span>
              <Button asChild variant="outline" size="sm">
                <a href={fetchArtifacts.getDownloadUrl(project.id, runId, artifact.id)}>Download</a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListState
            pending={comments.isPending}
            failed={comments.isError}
            empty={!comments.comments.length}
            title="Comments"
            retry={comments.refetch}
          />
          {comments.comments.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-2 border-b pb-3">
              <p className="text-muted-foreground text-xs">{comment.author_display_name ?? "Project member"}</p>
              <p className="whitespace-pre-wrap break-words text-sm">
                {comment.deleted ? "Comment deleted" : comment.body}
              </p>
              {!comment.deleted && !archived && (
                <ActionRow>
                  {comment.author_user_id === userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditId(comment.id);
                        setBody(comment.body ?? "");
                        setCommentOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  {(canManage || comment.author_user_id === userId) && (
                    <ConfirmAction
                      title="Delete comment"
                      disabled={deleteComment.isPending}
                      description="Remove this comment from the discussion."
                      onConfirm={() => perform(() => deleteComment.mutateAsync(comment.id), "Comment deleted.")}
                    />
                  )}
                </ActionRow>
              )}
            </div>
          ))}
          <LoadMore visible={Boolean(comments.hasNextPage)} pending={comments.isFetching} onClick={comments.loadMore} />
          {!archived && (
            <WorkspaceFormDialog
              title={editId ? "Edit comment" : "Add comment"}
              triggerLabel="Add comment"
              description="Share your feedback on this research run."
              submitLabel="Save comment"
              pending={createComment.isPending || editComment.isPending}
              open={commentOpen}
              onOpenChange={(open) => {
                setCommentOpen(open);
                if (!open) {
                  setEditId(null);
                  setBody("");
                }
              }}
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                if (!body.trim() || body.length > 5000) {
                  toast.error("Comments must contain 1–5,000 characters.");
                  return;
                }
                const result = await perform(
                  () =>
                    editId
                      ? editComment.mutateAsync({ commentId: editId, patch: { body } })
                      : createComment.mutateAsync({ body }),
                  editId ? "Comment updated." : "Comment added.",
                );
                if (result) {
                  setBody("");
                  setEditId(null);
                  return true;
                }
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="run-comment">{editId ? "Edit comment" : "Add a comment"}</FieldLabel>
                  <Textarea id="run-comment" value={body} onChange={(event) => setBody(event.target.value)} />
                </Field>
              </FieldGroup>
            </WorkspaceFormDialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
