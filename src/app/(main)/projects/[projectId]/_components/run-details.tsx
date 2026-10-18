"use client";

import { useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { Download, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { ManagementStatusBadge } from "@/components/management-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useArtifactsQuery } from "@/hooks/use-artifacts-query";
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useInfiniteComments,
  useUpdateCommentMutation,
} from "@/hooks/use-comments-query";
import { useAbandonRunMutation, useRunDetailQuery, useSyncRunMutation } from "@/hooks/use-runs-query";
import { projectKeys } from "@/lib/api/query-keys";
import { fetchArtifacts, type RunArtifactItem } from "@/lib/api/services/fetch-artifacts";
import { isActiveRun, type RunSection, researchRunUrl, runSections } from "@/lib/research-workspace";
import { ProjectStatus, RunStatus } from "@/types/enums";

import { ArtifactPreview } from "./artifact-preview";
import { ExperimentTabs } from "./experiment-tabs";
import { FrameReviews } from "./frame-reviews";
import { RunComment } from "./run-comment";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { RunSummarySkeleton } from "./workspace-skeletons";
import { ActionRow, ConfirmAction, ListState, LoadMore, perform, type WorkspaceProps } from "./workspace-ui";

export function RunDetails({
  project,
  canWrite,
  canManage,
  userId,
  runId,
  section,
}: WorkspaceProps & { runId: string; section?: RunSection }) {
  const client = useQueryClient();
  const query = useRunDetailQuery(project.id, runId);
  const sync = useSyncRunMutation(project.id, runId);
  const abandon = useAbandonRunMutation(project.id, runId);
  const artifacts = useArtifactsQuery(project.id, runId);
  const router = useRouter();
  const params = useSearchParams();
  const artifactFilter = params.get("artifact") ?? "all";
  const setArtifactFilter = (id: string) =>
    router.replace(
      `${researchRunUrl(project.id, runId, "comments")}${id === "all" ? "" : `?artifact=${encodeURIComponent(id)}`}`,
      { scroll: false },
    );
  const [commentArtifact, setCommentArtifact] = useState<string | null>(null);
  const [preview, setPreview] = useState<RunArtifactItem | null>(null);
  const comments = useInfiniteComments(
    project.id,
    runId,
    artifactFilter === "all" ? undefined : { artifact_id: artifactFilter },
    { refetchInterval: (state) => (state.state.error ? false : 30_000) },
  );
  const createComment = useCreateCommentMutation(project.id, runId);
  const editComment = useUpdateCommentMutation(project.id, runId);
  const deleteComment = useDeleteCommentMutation(project.id, runId);
  const [body, setBody] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const run = query.data?.data;
  const tab = section ?? (run?.status === RunStatus.AwaitingReview ? "frame-review" : "artifacts");
  const active = run && isActiveRun(run.status);
  const archived = project.status === ProjectStatus.Archived;
  useEffect(() => {
    if (!run?.updated_at) return;
    // A polled run transition can produce artifacts or another review sequence.
    for (const queryKey of [
      projectKeys.artifacts(project.id, runId),
      projectKeys.frameReview(project.id, runId),
      projectKeys.frameReviews(project.id, runId),
    ])
      void client.invalidateQueries({ queryKey });
  }, [client, project.id, runId, run?.updated_at]);
  const composing = params.get("compose") === "1";
  useEffect(() => {
    if (composing && tab === "comments" && !archived) {
      setCommentArtifact(artifactFilter === "all" ? null : artifactFilter);
      setCommentOpen(true);
    }
  }, [composing, tab, archived, artifactFilter]);
  useEffect(() => {
    if (run?.failure_message) toast.error(run.failure_message, { id: `run-failure:${run.id}` });
  }, [run?.id, run?.failure_message]);
  const commentAction = !archived && (
    <WorkspaceFormDialog
      title={editId ? "Edit comment" : "Add comment"}
      triggerLabel="Add comment"
      triggerVariant="default"
      description={
        commentArtifact
          ? `Feedback on ${artifacts.data?.data.find((artifact) => artifact.id === commentArtifact)?.filename ?? "this artifact"}.`
          : "Share your feedback on this research run."
      }
      submitLabel="Save comment"
      pending={createComment.isPending || editComment.isPending}
      open={commentOpen}
      onOpenChange={(open) => {
        setCommentOpen(open);
        if (open && !editId) setCommentArtifact(artifactFilter === "all" ? null : artifactFilter);
        if (!open) {
          if (composing) setArtifactFilter(artifactFilter);
          setCommentArtifact(null);
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
              : createComment.mutateAsync({ body, artifact_id: commentArtifact }),
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
          <Textarea
            id="run-comment"
            className="min-h-32"
            placeholder="Share feedback, ask a question, or suggest an improvement."
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>
      </FieldGroup>
    </WorkspaceFormDialog>
  );
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <ListState
            pending={query.isPending}
            failed={query.isError}
            empty={!run}
            title="Run details"
            retry={query.refetch}
            loading={<RunSummarySkeleton label="Loading run details" />}
          />
          {run && (
            <>
              <ManagementStatusBadge status={run.status} />
              <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                {run.dataset_version_number !== null && (
                  <div>
                    <dt className="text-muted-foreground">Dataset</dt>
                    <dd>Version {run.dataset_version_number}</dd>
                  </div>
                )}
                {run.topic && (
                  <div>
                    <dt className="text-muted-foreground">Research topic</dt>
                    <dd className="max-w-xl break-words">{run.topic}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Cost / budget</dt>
                  <dd>
                    ${run.cost_usd} / ${run.budget_usd}
                  </dd>
                </div>
              </dl>
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
      {run && (
        <ExperimentTabs
          value={tab}
          items={runSections.map((item) => ({ ...item, href: researchRunUrl(project.id, runId, item.value) }))}
        >
          {tab === "frame-review" && (
            <FrameReviews
              projectId={project.id}
              runId={runId}
              canWrite={canWrite}
              awaitingReview={run.status === RunStatus.AwaitingReview}
            />
          )}
          {tab === "artifacts" && (
            <Card id="artifacts" className="scroll-mt-16">
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
                    <ActionRow>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Preview ${artifact.filename}`}
                            onClick={() => setPreview(artifact)}
                          >
                            <Eye aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Preview</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="outline" size="icon">
                            <a
                              aria-label={`Download ${artifact.filename}`}
                              href={fetchArtifacts.getDownloadUrl(project.id, runId, artifact.id)}
                            >
                              <Download aria-hidden="true" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                      {!archived && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label={`Comment on ${artifact.filename}`}
                              onClick={() => {
                                setEditId(null);
                                setBody("");
                                setCommentArtifact(artifact.id);
                                router.push(
                                  `${researchRunUrl(project.id, runId, "comments")}?artifact=${encodeURIComponent(artifact.id)}&compose=1`,
                                  { scroll: false },
                                );
                              }}
                            >
                              <MessageSquare aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Comment on this file</TooltipContent>
                        </Tooltip>
                      )}
                    </ActionRow>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {preview && (
            <ArtifactPreview
              key={preview.id}
              projectId={project.id}
              artifact={preview}
              onClose={() => setPreview(null)}
            />
          )}
          {tab === "comments" && (
            <Card id="comments" className="scroll-mt-16">
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <FieldGroup className="min-w-0 flex-1 sm:max-w-sm">
                    <Field>
                      <FieldLabel htmlFor="comment-artifact-filter">Filter comments</FieldLabel>
                      <Select value={artifactFilter} onValueChange={setArtifactFilter}>
                        <SelectTrigger id="comment-artifact-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="all">All comments</SelectItem>
                            {artifacts.data?.data.map((artifact) => (
                              <SelectItem key={artifact.id} value={artifact.id}>
                                {artifact.filename}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                  <div className="shrink-0">{commentAction}</div>
                </div>
                <ListState
                  pending={comments.isPending}
                  failed={comments.isError}
                  empty={!comments.comments.length}
                  title="Comments"
                  retry={comments.refetch}
                />
                <ul className="min-w-0 divide-y" aria-label="Run comments">
                  {comments.comments.map((comment) => (
                    <li key={comment.id} className="min-w-0">
                      <RunComment
                        comment={comment}
                        filename={
                          artifacts.data?.data.find((artifact) => artifact.id === comment.artifact_id)?.filename
                        }
                        own={comment.author_user_id === userId}
                        canEdit={!comment.deleted && !archived && comment.author_user_id === userId}
                        canDelete={!comment.deleted && !archived && (canManage || comment.author_user_id === userId)}
                        deleting={deleteComment.isPending}
                        onEdit={() => {
                          setEditId(comment.id);
                          setCommentArtifact(comment.artifact_id);
                          setBody(comment.body ?? "");
                          setCommentOpen(true);
                        }}
                        onDelete={() => perform(() => deleteComment.mutateAsync(comment.id), "Comment deleted.")}
                      />
                    </li>
                  ))}
                </ul>
                <LoadMore
                  visible={Boolean(comments.hasNextPage)}
                  pending={comments.isFetching}
                  onClick={comments.loadMore}
                />
              </CardContent>
            </Card>
          )}
        </ExperimentTabs>
      )}
    </div>
  );
}
