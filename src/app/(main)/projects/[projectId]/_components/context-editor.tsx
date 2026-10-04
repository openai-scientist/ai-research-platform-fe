"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useInfiniteDatasets } from "@/hooks/use-datasets-query";
import { useSaveResearchContextMutation } from "@/hooks/use-research-context-query";
import type { FrontMatter, ResearchContextItem } from "@/lib/api/services/fetch-research-context";
import { ApiError } from "@/types/api";

import { ContextDetailFields } from "./context-detail-fields";
import { ContextDisclosure } from "./context-disclosure";
import { ContextSnapshot } from "./context-history";
import { ContextHistoryDialog } from "./context-history-dialog";
import { ContextItemList, contextItemSummary } from "./context-item-list";
import { DatasetColumnPicker } from "./dataset-column-picker";
import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ListState, LoadMore } from "./workspace-ui";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function makeDraft(context: ResearchContextItem | null) {
  const front = context?.front_matter ?? {};

  const { domain, objectives, variables, ...metadata } = front;

  return {
    body: context?.body ?? "",

    domain: domain ?? "",

    objectives: (objectives ?? []).map((value, index) => ({ id: `objective-${index}`, value })),

    variables: Object.entries(variables ?? {}).map(([name, value], index) => ({
      id: `variable-${index}`,

      name,

      value,
    })),

    metadata: metadata as FrontMatter,
  };
}

export function ContextEditor({
  projectId,

  context,

  canWrite,

  reload,

  embedded = false,
}: {
  projectId: string;

  embedded?: boolean;

  context: ResearchContextItem | null;

  canWrite: boolean;

  reload: () => Promise<ResearchContextItem | null | undefined>;
}) {
  const Header = embedded ? "div" : CardHeader;

  const Content = embedded ? "div" : CardContent;

  const Action = embedded ? "div" : CardAction;

  const [draft, setDraft] = useState(() => makeDraft(context));

  const [editorTab, setEditorTab] = useState("question");

  const [base, setBase] = useState(context);

  const [conflict, setConflict] = useState<ResearchContextItem | null>(null);

  const save = useSaveResearchContextMutation(projectId);

  const datasets = useInfiniteDatasets(projectId, { enabled: canWrite });

  const columns = [...new Set(datasets.datasets.flatMap((dataset) => dataset.latest_version?.column_names ?? []))];

  const roles = ["outcome", "exposure", "covariate", "cluster"];

  const saveContext = async () => {
    if (!draft.body.trim() || draft.body.length > 50000) {
      setEditorTab("question");

      toast.error("Research context must contain 1–50,000 characters.");

      return;
    }

    const names = draft.variables.map((variable) => variable.name.trim());

    if (names.some((name) => !name) || new Set(names).size !== names.length) {
      setEditorTab("variables");

      toast.error("Give each variable a unique, non-empty column name.");

      return;
    }

    try {
      const result = await save.mutateAsync({
        body: draft.body,

        base_version: base?.version_number ?? 0,

        front_matter: {
          ...draft.metadata,

          domain: draft.domain || null,

          objectives: draft.objectives.map((objective) => objective.value),

          variables: Object.fromEntries(draft.variables.map((variable, index) => [names[index], variable.value])),
        },
      });

      setBase(result.data);

      setDraft(makeDraft(result.data));

      setConflict(null);

      toast.success("Research context saved.");

      return true;
    } catch (error) {
      if (error instanceof ApiError && error.code === "RESEARCH_CONTEXT_CONFLICT") {
        const latest = await reload();

        if (latest) setConflict(latest);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card id="research-context" className={embedded ? "min-w-0 shrink-0 gap-0 p-0" : undefined}>
        {(!embedded || context !== null || canWrite) && (
          <Header
            className={
              embedded
                ? "flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4"
                : "flex flex-col gap-3 sm:grid"
            }
          >
            {embedded && (
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-semibold text-base">
                  {context ? `Version ${context.version_number}` : "Research question & context"}
                </h3>
                {context && (
                  <p className="text-muted-foreground text-xs">
                    Saved <time dateTime={context.created_at}>{new Date(context.created_at).toLocaleString()}</time>
                  </p>
                )}
              </div>
            )}
            {!embedded && (
              <>
                <CardTitle>Research question & context</CardTitle>
                <CardDescription>
                  Markdown, objectives and dataset variables. Each save creates a new version.
                </CardDescription>
              </>
            )}
            <Action className="flex flex-wrap items-center gap-2">
              {canWrite && (
                <Tabs value={editorTab} onValueChange={setEditorTab}>
                  <WorkspaceFormDialog
                    formHeader={
                      <TabsList aria-label="Edit context sections" className="w-full">
                        <TabsTrigger value="question">Question</TabsTrigger>
                        <TabsTrigger value="variables">Variables</TabsTrigger>
                        <TabsTrigger value="details">More details</TabsTrigger>
                      </TabsList>
                    }
                    title="Edit research context"
                    triggerVariant="default"
                    triggerLabel={base ? "Edit research context" : "New research question"}
                    description="Describe what you want to learn, then choose the data to study. Saving creates a new version."
                    submitLabel="Save research context"
                    pending={save.isPending}
                    openOnHash="research-context"
                    onOpenChange={(open) => {
                      if (open) {
                        setEditorTab("question");

                        setBase(context);

                        setDraft(makeDraft(context));

                        setConflict(null);
                      }
                    }}
                    onSubmit={async (event) => {
                      event.preventDefault();

                      return saveContext();
                    }}
                  >
                    <TabsContent value="question">
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="research-body">
                            Research question <span className="text-muted-foreground">(required)</span>
                          </FieldLabel>
                          <Textarea
                            id="research-body"
                            rows={5}
                            className="min-h-32"
                            placeholder="For example: Does study time improve exam performance after accounting for school?"
                            value={draft.body}
                            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                          />
                          <FieldDescription>
                            Describe your question and relevant background. Formatting with Markdown is optional.
                          </FieldDescription>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="research-domain">
                            Research area <span className="text-muted-foreground">(optional)</span>
                          </FieldLabel>
                          <Input
                            id="research-domain"
                            placeholder="For example: Education or public health"
                            value={draft.domain}
                            onChange={(event) => setDraft({ ...draft, domain: event.target.value })}
                          />
                        </Field>
                        <Field>
                          <FieldLabel>
                            Objectives <span className="text-muted-foreground">(optional)</span>
                          </FieldLabel>
                          <FieldDescription>What would you like this research to find out?</FieldDescription>
                          <ContextItemList
                            label="Objective"
                            items={draft.objectives.map((item) => ({
                              id: item.id,
                              summary: contextItemSummary(item.value),
                            }))}
                            onAdd={() => {
                              const id = crypto.randomUUID();
                              setDraft({ ...draft, objectives: [...draft.objectives, { id, value: "" }] });
                              return id;
                            }}
                            onRemove={(id) =>
                              setDraft({ ...draft, objectives: draft.objectives.filter((item) => item.id !== id) })
                            }
                          >
                            {(id) => {
                              const objective = draft.objectives.find((item) => item.id === id);
                              if (!objective) return null;
                              return (
                                <ContextDetailFields
                                  label="Objective"
                                  value={objective.value}
                                  placeholder="For example: Estimate how study time affects exam scores."
                                  onChange={(value) =>
                                    setDraft({
                                      ...draft,
                                      objectives: draft.objectives.map((item) =>
                                        item.id === id ? { ...item, value } : item,
                                      ),
                                    })
                                  }
                                />
                              );
                            }}
                          </ContextItemList>
                        </Field>
                      </FieldGroup>
                    </TabsContent>
                    <TabsContent value="variables">
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Dataset variables</FieldLabel>
                          <FieldDescription>
                            Choose dataset columns and explain how each is used. Suggestions come from your latest
                            uploaded datasets.
                          </FieldDescription>
                          <ContextItemList
                            label="Variable"
                            items={draft.variables.map((item) => ({ id: item.id, summary: item.name || "Not filled" }))}
                            onAdd={() => {
                              const id = crypto.randomUUID();
                              setDraft({
                                ...draft,
                                variables: [...draft.variables, { id, name: "", value: { role: "covariate" } }],
                              });
                              return id;
                            }}
                            onRemove={(id) =>
                              setDraft({ ...draft, variables: draft.variables.filter((item) => item.id !== id) })
                            }
                          >
                            {(id) => {
                              const index = draft.variables.findIndex((item) => item.id === id);
                              const variable = draft.variables[index];
                              if (!variable) return null;
                              const role =
                                isRecord(variable.value) && typeof variable.value.role === "string"
                                  ? variable.value.role
                                  : "";

                              return (
                                <div className="grid items-start gap-3 sm:grid-cols-2">
                                  <Field className="min-w-0 flex-1 basis-40">
                                    <FieldLabel htmlFor={`variable-${variable.id}`}>Dataset column</FieldLabel>
                                    <DatasetColumnPicker
                                      id={`variable-${variable.id}`}
                                      label={`Variable ${index + 1} column`}
                                      value={variable.name}
                                      columns={columns}
                                      onChange={(name) =>
                                        setDraft({
                                          ...draft,
                                          variables: draft.variables.map((item) =>
                                            item.id === variable.id ? { ...item, name } : item,
                                          ),
                                        })
                                      }
                                    />
                                  </Field>
                                  <Field className="min-w-0 flex-1 basis-40">
                                    <FieldLabel>Used as</FieldLabel>
                                    <Select
                                      value={role}
                                      onValueChange={(next) =>
                                        setDraft({
                                          ...draft,

                                          variables: draft.variables.map((item) =>
                                            item.id === variable.id
                                              ? {
                                                  ...item,
                                                  value: { ...(isRecord(item.value) ? item.value : {}), role: next },
                                                }
                                              : item,
                                          ),
                                        })
                                      }
                                    >
                                      <SelectTrigger
                                        className="w-full min-w-0"
                                        aria-label={`Variable ${index + 1} role`}
                                      >
                                        <SelectValue placeholder="Choose a role">
                                          {role ? role.charAt(0).toUpperCase() + role.slice(1) : undefined}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectGroup>
                                          {[...new Set([...roles, ...(role ? [role] : [])])].map((value) => (
                                            <SelectItem key={value} value={value}>
                                              {(
                                                {
                                                  outcome: "Outcome — what you measure",
                                                  exposure: "Exposure — what may affect it",
                                                  covariate: "Covariate — factor to account for",
                                                  cluster: "Cluster — grouping column",
                                                } as Record<string, string>
                                              )[value] ?? value}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                      {
                                        (
                                          {
                                            outcome: "The result you want to measure.",
                                            exposure: "The factor whose effect you want to study.",
                                            covariate: "Another factor to account for.",
                                            cluster: "The column that groups related observations.",
                                          } as Record<string, string>
                                        )[role]
                                      }
                                    </FieldDescription>
                                  </Field>
                                </div>
                              );
                            }}
                          </ContextItemList>
                          <ListState
                            pending={datasets.isPending}
                            failed={datasets.isError}
                            empty={false}
                            title="Dataset suggestions"
                            retry={datasets.refetch}
                          />
                          <LoadMore
                            visible={Boolean(datasets.hasNextPage)}
                            pending={datasets.isFetching}
                            onClick={datasets.loadMore}
                          />
                        </Field>
                      </FieldGroup>
                    </TabsContent>
                    <TabsContent value="details">
                      <FieldGroup>
                        <FieldDescription>
                          Optional background to guide the research. Add only what is relevant.
                        </FieldDescription>
                        {(
                          [
                            ["assumptions", "Assumptions", "What are you assuming about the data or participants?", []],

                            [
                              "constraints",
                              "Constraints",
                              "Limits the research should respect, such as scope or time.",
                              {},
                            ],

                            ["design", "Study design", "How should this research be carried out?", {}],

                            ["concepts", "Key concepts", "Define any terms that could be misunderstood.", []],

                            ["notes", "Notes", "Other information the research should consider.", {}],
                          ] as const
                        ).map(([key, label, description, fallback]) => (
                          <ContextDisclosure key={key} title={label} description={description}>
                            <ContextDetailFields
                              label={label}
                              placeholder={
                                (
                                  {
                                    assumptions: "For example: Participants report their study time accurately.",
                                    concepts:
                                      "For example: Study time means hours spent studying outside class each week.",
                                  } as Record<string, string>
                                )[key] ?? "Describe this in your own words."
                              }
                              value={draft.metadata[key] ?? fallback}
                              onChange={(value) =>
                                setDraft({ ...draft, metadata: { ...draft.metadata, [key]: value } })
                              }
                            />
                          </ContextDisclosure>
                        ))}
                      </FieldGroup>
                    </TabsContent>
                    {conflict && (
                      <Field>
                        <FieldLabel>Latest saved context · version {conflict.version_number}</FieldLabel>
                        <ContextSnapshot context={conflict} />
                        <FieldDescription>
                          Your draft is preserved above. Merge the latest changes before saving again.
                        </FieldDescription>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setBase(conflict);

                            setConflict(null);
                          }}
                        >
                          I have merged the latest changes
                        </Button>
                      </Field>
                    )}
                  </WorkspaceFormDialog>
                </Tabs>
              )}
              {embedded && <ContextHistoryDialog projectId={projectId} />}
            </Action>
          </Header>
        )}
        <Content className={embedded ? "p-4 sm:p-5" : undefined}>
          {context ? (
            <ContextSnapshot context={context} showMetadata={!embedded} />
          ) : (
            <p className="text-muted-foreground text-sm">No research context yet.</p>
          )}
        </Content>
      </Card>
    </div>
  );
}
