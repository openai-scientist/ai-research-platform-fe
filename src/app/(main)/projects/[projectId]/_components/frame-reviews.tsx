"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useFrameReviewHistoryQuery,
  useFrameReviewQuery,
  useSubmitFrameReviewMutation,
} from "@/hooks/use-frame-reviews-query";
import type { FrameReviewItem, ReviewSignal } from "@/lib/api/services/fetch-frame-reviews";
import { FrameReviewStatus, ReviewSignalKind } from "@/types/enums";

import { ContextDisclosure } from "./context-disclosure";
import { dataLabel, isRecord, StructuredData } from "./structured-data";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, perform } from "./workspace-ui";

function FrameDecision({
  projectId,
  runId,
  item,
  canWrite,
}: {
  projectId: string;
  runId: string;
  item: FrameReviewItem;
  canWrite: boolean;
}) {
  const submit = useSubmitFrameReviewMutation(projectId, runId);
  const [note, setNote] = useState("");
  const [decisions, setDecisions] = useState<Record<string, { signal: ReviewSignalKind; value: string }>>({});
  const editable = canWrite && item.status === FrameReviewStatus.Pending;
  return (
    <WorkspaceFormDialog
      title={`Frame review · sequence ${item.sequence}`}
      triggerLabel={editable ? "Review frame" : "View frame and decision"}
      description="Inspect the proposed frame and its review decision."
      submitLabel="Submit frame review"
      pending={submit.isPending}
      hideSubmit={!editable}
      openOnHash={editable ? "frame-review" : undefined}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!editable) return;
        const signals: ReviewSignal[] = [];
        try {
          for (const id of Object.keys(item.request.items)) {
            const decision = decisions[id];
            signals.push({
              id,
              signal: decision?.signal ?? ReviewSignalKind.Approve,
              ...(decision?.signal === ReviewSignalKind.Edit ? { value: JSON.parse(decision.value) as unknown } : {}),
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
          const proposal = isRecord(value) && "value" in value ? value.value : value;
          const description = isRecord(value) && typeof value.description === "string" ? value.description : null;
          const status = isRecord(value) && typeof value.status === "string" ? value.status : null;
          return (
            <div key={id} className="flex min-w-0 flex-col gap-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="min-w-0 break-words font-medium text-sm">{dataLabel(id)}</h3>
                {status && <Badge variant="secondary">{dataLabel(status)}</Badge>}
              </div>
              {description && <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>}
              {id.startsWith("variables.") && id.endsWith(".role") && typeof proposal === "string" ? (
                <dl className="flex flex-col gap-2 text-sm">
                  <dt className="text-muted-foreground">Proposed role</dt>
                  <dd>
                    <Badge variant="secondary">{dataLabel(proposal)}</Badge>
                  </dd>
                </dl>
              ) : (
                <StructuredData value={proposal} technical={false} />
              )}
              {editable && (
                <Field>
                  <FieldLabel htmlFor={`frame-${item.id}-${index}`}>Your decision</FieldLabel>
                  <Select
                    value={decisions[id]?.signal ?? ReviewSignalKind.Approve}
                    onValueChange={(signal) =>
                      setDecisions((current) => ({
                        ...current,
                        [id]: {
                          signal: signal as ReviewSignalKind,
                          value: current[id]?.value ?? JSON.stringify(proposal, null, 2),
                        },
                      }))
                    }
                  >
                    <SelectTrigger id={`frame-${item.id}-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={ReviewSignalKind.Approve}>Approve</SelectItem>
                        <SelectItem value={ReviewSignalKind.Edit}>Edit</SelectItem>
                        <SelectItem value={ReviewSignalKind.Reject}>Reject</SelectItem>
                        <SelectItem value={ReviewSignalKind.Unknown}>Not sure</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {editable && decisions[id]?.signal === ReviewSignalKind.Edit && (
                <FrameValueEditor
                  id={id}
                  proposal={proposal}
                  serialized={decisions[id].value}
                  onChange={(next) =>
                    setDecisions((current) => ({ ...current, [id]: { ...current[id], value: next } }))
                  }
                />
              )}
            </div>
          );
        })}
        {editable && (
          <Field>
            <FieldLabel htmlFor={`frame-note-${item.id}`}>Review note</FieldLabel>
            <Textarea id={`frame-note-${item.id}`} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        )}
        {item.decision && (
          <section className="flex min-w-0 flex-col gap-4 rounded-lg border p-4" aria-label="Submitted decision">
            <h3 className="font-medium text-sm">Submitted decision</h3>
            <StructuredData value={item.decision} />
            <p className="text-muted-foreground text-xs">
              {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : ""}
            </p>
          </section>
        )}
      </FieldGroup>
    </WorkspaceFormDialog>
  );
}

function FrameValueEditor({
  id,
  proposal,
  serialized,
  onChange,
}: {
  id: string;
  proposal: unknown;
  serialized: string;
  onChange: (value: string) => void;
}) {
  const edited: unknown = (() => {
    try {
      return JSON.parse(serialized) as unknown;
    } catch {
      return proposal;
    }
  })();
  if (typeof proposal === "string") {
    if (id.startsWith("variables.") && id.endsWith(".role")) {
      const roles = [...new Set(["outcome", "exposure", "covariate", "cluster", proposal])];
      return (
        <Field>
          <FieldLabel>Use this variable as</FieldLabel>
          <Select
            value={typeof edited === "string" ? edited : proposal}
            onValueChange={(value) => onChange(JSON.stringify(value))}
          >
            <SelectTrigger aria-label={`Updated role for ${dataLabel(id)}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {dataLabel(role)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      );
    }
    return (
      <Field>
        <FieldLabel>Updated value</FieldLabel>
        <Textarea
          aria-label={`Updated value for ${dataLabel(id)}`}
          value={typeof edited === "string" ? edited : proposal}
          onChange={(event) => onChange(JSON.stringify(event.target.value))}
        />
      </Field>
    );
  }
  if (isRecord(proposal) && typeof proposal.text === "string") {
    const text = isRecord(edited) && typeof edited.text === "string" ? edited.text : proposal.text;
    return (
      <Field>
        <FieldLabel>Updated text</FieldLabel>
        <Textarea
          aria-label={`Updated text for ${dataLabel(id)}`}
          value={text}
          onChange={(event) =>
            onChange(JSON.stringify({ ...proposal, ...(isRecord(edited) ? edited : {}), text: event.target.value }))
          }
        />
      </Field>
    );
  }
  return (
    <ContextDisclosure
      title="Advanced editing"
      description="This item has a custom structure. Edit its JSON value here."
    >
      <Field>
        <FieldLabel>JSON value</FieldLabel>
        <Textarea
          aria-label={`Edited JSON value for ${id}`}
          value={serialized}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    </ContextDisclosure>
  );
}

export function FrameReviews({
  projectId,
  runId,
  canWrite,
  awaitingReview,
}: {
  projectId: string;
  runId: string;
  canWrite: boolean;
  awaitingReview: boolean;
}) {
  const history = useFrameReviewHistoryQuery(projectId, runId);
  const current = useFrameReviewQuery(projectId, runId, { enabled: awaitingReview });
  const pending = history.isPending || (awaitingReview && current.isPending);
  const frames = new Map((history.data?.data ?? []).map((item) => [item.id, item]));
  if (awaitingReview && current.data) frames.set(current.data.data.id, current.data.data);
  const items = [...frames.values()].sort((a, b) => b.sequence - a.sequence);
  return (
    <Card id="frame-review">
      <CardHeader>
        <CardTitle>Frame reviews</CardTitle>
        <CardDescription>Proposed frames and review decisions from every sequence of this run.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListState
          pending={pending}
          failed={history.isError || (awaitingReview && current.isError)}
          empty={!items.length}
          title="Frame reviews"
          retry={() => {
            void history.refetch();
            if (awaitingReview) void current.refetch();
          }}
        />
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm">
                Sequence {item.sequence} · {new Date(item.requested_at).toLocaleString()}
              </span>
              <Badge variant="secondary">{item.status}</Badge>
            </div>
            <FrameDecision
              key={`${item.id}:${item.status}`}
              projectId={projectId}
              runId={runId}
              item={item}
              canWrite={canWrite && awaitingReview && current.data?.data.id === item.id}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
