"use client";

import { useState } from "react";

import { FocusScope } from "@radix-ui/react-focus-scope";
import { cn } from "cn";
import { ArrowLeft, ArrowRight, Check, Database, Table2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/header/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type ConnectionItem,
  type ConnectionKind,
  isGoogleConnection,
} from "@/lib/api/services/fetch-data-connections";
import type { DatasetItem } from "@/lib/api/services/fetch-datasets";
import type { ProjectItem } from "@/lib/api/services/fetch-project";

import { CONNECTION_PROVIDERS, ConnectionLogo } from "./connection-display";
import { ConnectionForm, ConnectionGuidance } from "./connection-form";
import { ConnectionPreviewStep } from "./connection-preview-step";
import { ConnectionCatalogRefresh, ConnectionSourceControls, ConnectionSourceStep } from "./connection-source-step";
import type { GoogleConnectionResume } from "./google-connection-state";
import { GoogleReconnectButton } from "./google-reconnect-button";
import { type ConnectionFlowState, type ConnectionStep, useConnectionFlow } from "./use-connection-flow";

const STAGES = [
  {
    label: "Provider",
    title: "Choose your data provider",
    purpose: "Choose the database, spreadsheet or folder that holds your research data.",
    output: "Data provider",
  },
  {
    label: "Connect",
    title: "Connect your data source",
    purpose: "Enter connection details. We will check access before saving.",
    output: "Saved connection",
  },
  {
    label: "Source",
    title: "Choose your data source",
    purpose: "Pick a table or write a SELECT query to define the data you need.",
    output: "Table or SELECT query",
  },
  {
    label: "Preview",
    title: "Review your data",
    purpose: "Check the columns and sample rows before creating a dataset.",
    output: "Data preview",
  },
  {
    label: "Import",
    title: "Create your dataset",
    purpose: "Name this snapshot and import it into your project.",
    output: "Dataset version",
  },
] as const;

function flowStages(flow: ConnectionFlowState) {
  return STAGES.flatMap((stage, step) =>
    flow.isGoogle && step === 1 ? [] : [{ ...stage, step: step as ConnectionStep }],
  );
}

function currentStage(flow: ConnectionFlowState) {
  const stage = STAGES[flow.step];
  return flow.isGoogle && flow.step === 2
    ? { ...stage, purpose: "Choose a file or spreadsheet tab to import.", output: "Table source" }
    : stage;
}

function StageTrack({ flow }: { flow: ConnectionFlowState }) {
  return (
    <nav aria-label="Data connection progress" className="shrink-0 overflow-x-auto border-b px-4 py-3.5 md:px-6">
      <ol className={cn("grid gap-2", flow.isGoogle ? "grid-cols-4" : "grid-cols-5")}>
        {flowStages(flow).map((stage, index) => (
          <li key={stage.label} className="min-w-0">
            <button
              type="button"
              disabled={
                flow.busy ||
                flow.reconcileRequired ||
                stage.step >= flow.step ||
                (Boolean(flow.connection) && stage.step < 2)
              }
              onClick={() => flow.setStep(stage.step)}
              aria-current={stage.step === flow.step ? "step" : undefined}
              className="flex min-h-9 w-full flex-col justify-center gap-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
            >
              <span
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap text-xs",
                  stage.step > flow.step ? "text-muted-foreground" : "text-foreground",
                  stage.step === flow.step && "font-semibold",
                )}
              >
                <span className="hidden font-mono text-muted-foreground sm:inline">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {stage.label}
              </span>
              <span className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                {stage.step <= flow.step && (
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
                      stage.step === flow.step ? "w-1/2 bg-sky-500" : "w-full bg-foreground",
                    )}
                  />
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function FlowContext({ flow, project }: { flow: ConnectionFlowState; project: ProjectItem }) {
  const stage = currentStage(flow);
  const facts = [
    ...(flow.connection
      ? [
          {
            label: "Connection",
            value: `${flow.connection.name} · ${CONNECTION_PROVIDERS[flow.connection.kind].label}`,
          },
        ]
      : flow.step === 1 || flow.isGoogle
        ? [{ label: "Provider", value: CONNECTION_PROVIDERS[flow.kind].label }]
        : []),
    ...(flow.source
      ? [
          {
            label: "Source",
            value: flow.source.type === "table" ? `${flow.source.schema}.${flow.source.name}` : "SELECT query",
          },
        ]
      : []),
    { label: "Project", value: project.name },
  ];
  return (
    <ScrollArea
      type="hover"
      className="hidden h-full min-h-0 min-w-0 border-l bg-muted/20 lg:block [&_[data-slot=scroll-area-viewport]]:overscroll-contain"
    >
      <aside className="flex min-w-0 flex-col gap-4 p-4">
        <Card size="sm" className="shrink-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Now</span>
              <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span className="size-1.5 rounded-full bg-sky-500" />
                {flow.busy ? "Working" : "Your step"}
              </span>
            </div>
            <CardTitle>{stage.label}</CardTitle>
            <CardDescription>{stage.purpose}</CardDescription>
          </CardHeader>
        </Card>
        <section className="flex shrink-0 flex-col gap-2">
          <h2 className="text-muted-foreground text-xs uppercase tracking-wide">Context</h2>
          <dl className="flex flex-col gap-2">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-xs">{fact.label}</dt>
                <dd className="break-words font-medium text-sm">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="flex shrink-0 flex-col gap-2">
          <h2 className="text-muted-foreground text-xs uppercase tracking-wide">What happens next</h2>
          <ol className="flex flex-col gap-2">
            {flowStages(flow).map((item) => (
              <li
                key={item.label}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  item.step <= flow.step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border",
                    item.step < flow.step && "border-foreground bg-foreground text-background",
                    item.step === flow.step && "border-2 border-sky-500",
                  )}
                >
                  {item.step < flow.step && <Check className="size-2.5" aria-hidden="true" />}
                </span>
                {item.label}
              </li>
            ))}
          </ol>
        </section>
        {(flow.step === 1 || (flow.isGoogle && flow.step === 0)) && (
          <>
            <Separator />
            <ConnectionGuidance kind={flow.kind} ssl={flow.draft.ssl} compact />
          </>
        )}
        {flow.step >= 3 && (
          <p className="text-pretty text-muted-foreground text-xs leading-relaxed">
            Import creates a CSV snapshot. The source is not synced automatically. Previous versions are preserved when
            refreshing data.
          </p>
        )}
      </aside>
    </ScrollArea>
  );
}

function FlowActions({ flow, placement = "footer" }: { flow: ConnectionFlowState; placement?: "header" | "footer" }) {
  if (flow.step === 0) return null;
  const label =
    flow.step === 1
      ? "Connect and continue"
      : flow.step === 2
        ? "Continue to preview"
        : flow.step === 3
          ? "Continue to import"
          : flow.reconcileRequired
            ? "Reload datasets"
            : "Import dataset";
  const next = () => {
    if (flow.step === 1) void flow.connect();
    else if (flow.step === 2) void flow.previewSource();
    else if (flow.step === 3) flow.setStep(4);
    else if (flow.reconcileRequired) void flow.reconcileImport();
    else void flow.importDataset();
  };
  const Container = placement === "header" ? "div" : "footer";
  const buttonClass = flow.step === 2 && placement === "header" ? "h-8" : "h-11 md:h-10";
  return (
    <Container
      className={cn(
        "flex items-center gap-3",
        placement === "header" ? "justify-end" : "justify-between border-t pt-5",
      )}
    >
      {flow.step !== 2 && (
        <Button
          type="button"
          variant="outline"
          className={buttonClass}
          disabled={flow.busy || flow.reconcileRequired}
          onClick={() => flow.setStep((flow.step - 1) as ConnectionStep)}
        >
          Back
        </Button>
      )}
      {(flow.configured || flow.reconcileRequired) && (
        <Button
          type="button"
          className={buttonClass}
          disabled={
            flow.reconcileRequired
              ? flow.busy
              : flow.disabled ||
                (flow.step === 2 && (!flow.source || flow.needsReauthorization)) ||
                (flow.step === 3 && !flow.preview?.rows.length)
          }
          onClick={next}
        >
          {flow.busy && <Spinner data-icon="inline-start" />}
          {flow.busy && flow.step === 4 ? "Importing…" : label}
        </Button>
      )}
    </Container>
  );
}

export function ConnectionFlow({
  project,
  initialConnection,
  googleResume,
  googleAvailable,
  userId,
  canWrite,
  onClose,
  onComplete,
}: {
  project: ProjectItem;
  initialConnection?: ConnectionItem;
  googleResume?: GoogleConnectionResume;
  googleAvailable: boolean;
  userId: string;
  canWrite: boolean;
  onClose: () => void;
  onComplete: (dataset: DatasetItem) => void;
}) {
  const flow = useConnectionFlow(
    project.id,
    initialConnection,
    onComplete,
    canWrite,
    userId,
    googleAvailable,
    googleResume,
  );
  const reduceMotion = useReducedMotion();
  const [details, setDetails] = useState(false);
  const stage = currentStage(flow);
  const stages = flowStages(flow);
  const from =
    flow.step === 0
      ? "Your data source"
      : flow.step === 1
        ? CONNECTION_PROVIDERS[flow.kind].label
        : flow.step === 2
          ? "Saved connection"
          : flow.step === 3
            ? "Selected source"
            : "Approved preview";
  const close = () => {
    if (!flow.busy) onClose();
  };

  // Changing Radix's modal prop remounts the whole flow. Release focus separately for Google Picker.
  return (
    <Dialog
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <FocusScope
        asChild
        loop
        trapped={!flow.pickerOpen}
        onMountAutoFocus={(event) => event.preventDefault()}
        onUnmountAutoFocus={(event) => event.preventDefault()}
      >
        <DialogContent
          showCloseButton={false}
          aria-modal={!flow.pickerOpen}
          className="top-0 left-0 flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-background p-0 data-open:animate-none data-closed:animate-none sm:max-w-none"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (flow.busy) event.preventDefault();
          }}
        >
          <DialogTitle className="sr-only">Data flow — {stage.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Connect an external data source, preview its data and import a dataset.
          </DialogDescription>
          <header className="flex min-h-14 shrink-0 items-center gap-3 border-b px-4 py-2 md:px-5">
            <Button variant="ghost" disabled={flow.busy} onClick={close}>
              <ArrowLeft data-icon="inline-start" />
              Data connections
            </Button>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <b className="hidden font-mono text-sm sm:block">Data flow</b>
            <span className="hidden min-w-0 truncate text-muted-foreground text-sm md:block">{project.name}</span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs" role="status">
              <span className="size-1.5 rounded-full bg-sky-500" />
              {flow.busy ? "Working" : flow.waitSeconds ? `Wait ${flow.waitSeconds}s` : "Setup"}
            </span>
            <ThemeSwitcher />
          </header>
          <StageTrack flow={flow} />
          <div
            className={cn(
              "grid min-h-0 flex-1 overflow-hidden",
              flow.step !== 2 && "lg:grid-cols-[minmax(0,1fr)_320px]",
            )}
          >
            <main
              className={cn(
                "flex min-h-0 min-w-0 flex-col px-4 md:px-8",
                flow.step === 2 ? "gap-3 pt-4" : "gap-6 pt-6",
              )}
            >
              <header
                className={cn(
                  "grid shrink-0 gap-3 border-b",
                  flow.step === 2
                    ? "grid-cols-1 items-center pb-3 lg:grid-cols-[minmax(0,1fr)_auto]"
                    : "grid-cols-[auto_minmax(0,1fr)] items-start pb-5",
                  (flow.step === 1 || flow.step === 3 || flow.step === 4) && "xl:grid-cols-[auto_minmax(0,1fr)_auto]",
                )}
              >
                {flow.step !== 2 && (
                  <span className="pt-1 font-mono text-muted-foreground text-xs">
                    {String(stages.findIndex((item) => item.step === flow.step) + 1).padStart(2, "0")}/
                    {String(stages.length).padStart(2, "0")}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <h1 className="min-w-0 break-words font-semibold text-lg">
                      {flow.step === 2 ? (flow.connection?.name ?? stage.title) : stage.title}
                    </h1>
                    {flow.step === 2 && flow.connection && (
                      <span
                        className="inline-flex min-w-0 items-center gap-2 text-muted-foreground text-sm"
                        title={CONNECTION_PROVIDERS[flow.kind].label}
                      >
                        <span className="shrink-0 [&_img]:size-5 [&_svg]:size-5">
                          <ConnectionLogo kind={flow.kind} />
                        </span>
                        <span>{CONNECTION_PROVIDERS[flow.kind].label}</span>
                      </span>
                    )}
                  </div>
                  {flow.step !== 2 && (
                    <>
                      <p className="mt-1 max-w-[68ch] text-pretty text-muted-foreground text-sm">{stage.purpose}</p>
                      <div className="mt-3 grid gap-2 text-xs sm:flex sm:flex-wrap sm:items-center">
                        <span className="flex items-center gap-2">
                          <span className="min-w-15 text-muted-foreground sm:min-w-0">Builds on</span>
                          <span className="rounded-md bg-muted px-2 py-1">{from}</span>
                        </span>
                        <ArrowRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
                        <span className="flex items-center gap-2">
                          <span className="min-w-15 text-muted-foreground sm:min-w-0">Creates</span>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/5 px-2 py-1 ring-1 ring-sky-500/35">
                            {flow.step === 4 ? (
                              <Database className="size-3" aria-hidden="true" />
                            ) : (
                              <Table2 className="size-3" aria-hidden="true" />
                            )}
                            {stage.output}
                          </span>
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {flow.step !== 0 && (
                  <div
                    className={cn(
                      "flex flex-wrap items-center justify-end gap-3 justify-self-end",
                      flow.step === 2 ? "col-span-1" : "col-span-2 xl:col-span-1",
                    )}
                  >
                    {flow.step === 2 && <ConnectionSourceControls flow={flow} />}
                    {flow.needsReauthorization && flow.connection && canWrite && (
                      <GoogleReconnectButton
                        projectId={project.id}
                        connectionId={flow.connection.id}
                        accountEmail={String(flow.connection.config.account_email ?? "")}
                        disabled={flow.busy}
                      />
                    )}
                    <FlowActions flow={flow} placement="header" />
                    {flow.step === 2 && <ConnectionCatalogRefresh flow={flow} />}
                  </div>
                )}
              </header>
              <div
                className={cn(
                  "min-h-0 flex-1 px-1 pt-1",
                  flow.step === 2 || flow.step === 3
                    ? "overflow-hidden pb-4"
                    : "overflow-y-auto overscroll-contain pb-8",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={flow.step}
                    className={cn(
                      "flex min-w-0 flex-col gap-5",
                      (flow.step === 2 || flow.step === 3) && "h-full min-h-0",
                    )}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {flow.step === 0 ? (
                      <>
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                          {(Object.keys(CONNECTION_PROVIDERS) as ConnectionKind[])
                            .filter((kind) => !isGoogleConnection(kind) || flow.googleAvailable)
                            .map((kind) => {
                              const provider = CONNECTION_PROVIDERS[kind];
                              return (
                                <button
                                  type="button"
                                  key={kind}
                                  disabled={flow.disabled}
                                  onClick={() => flow.chooseKind(kind)}
                                  className="rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                                >
                                  <Card className="h-full transition-colors hover:bg-muted/50">
                                    <CardHeader>
                                      <ConnectionLogo kind={kind} />
                                      <CardTitle className="mt-3">{provider.label}</CardTitle>
                                      <CardDescription>{provider.description}</CardDescription>
                                    </CardHeader>
                                    <CardFooter className="justify-between">
                                      <Badge variant="outline" className={provider.badgeColor}>
                                        {provider.category}
                                      </Badge>
                                      <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                                    </CardFooter>
                                  </Card>
                                </button>
                              );
                            })}
                        </div>
                        <p className="text-muted-foreground text-xs">Supabase uses PostgreSQL. MariaDB uses MySQL.</p>
                      </>
                    ) : flow.step === 1 && !isGoogleConnection(flow.kind) ? (
                      <section
                        className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4"
                        aria-labelledby="connection-details-title"
                      >
                        <h2 id="connection-details-title" className="font-medium text-base">
                          Connection details
                        </h2>
                        <ConnectionForm
                          kind={flow.kind}
                          draft={flow.draft}
                          setDraft={flow.setDraft}
                          disabled={flow.disabled}
                        />
                        <div className="lg:hidden">
                          <ConnectionGuidance kind={flow.kind} ssl={flow.draft.ssl} />
                        </div>
                      </section>
                    ) : flow.step === 2 ? (
                      <ConnectionSourceStep flow={flow} />
                    ) : (
                      <Card className={cn("w-full", flow.step === 3 && "h-full min-h-0 flex-1")}>
                        <CardContent className={cn("flex min-w-0 flex-col gap-5", flow.step === 3 && "min-h-0 flex-1")}>
                          {flow.step === 3 && <ConnectionPreviewStep preview={flow.preview} />}
                          {flow.step === 4 && (
                            <>
                              <FieldGroup>
                                <Field>
                                  <FieldLabel htmlFor="import-dataset-name">
                                    Dataset name <span className="text-destructive">*</span>
                                  </FieldLabel>
                                  <Input
                                    id="import-dataset-name"
                                    value={flow.datasetName}
                                    maxLength={160}
                                    aria-required
                                    className="h-11 bg-background md:h-10"
                                    disabled={flow.disabled}
                                    onChange={(event) => flow.setDatasetName(event.target.value)}
                                  />
                                </Field>
                                <Field>
                                  <FieldLabel htmlFor="import-dataset-description">Description</FieldLabel>
                                  <Textarea
                                    id="import-dataset-description"
                                    value={flow.description}
                                    maxLength={5000}
                                    className="min-h-28 bg-background"
                                    disabled={flow.disabled}
                                    onChange={(event) => flow.setDescription(event.target.value)}
                                  />
                                </Field>
                                <FieldDescription>
                                  This import creates a CSV snapshot. It does not sync automatically with the source.
                                </FieldDescription>
                                <FieldDescription>
                                  Imports may take up to 5 minutes. A successful import opens the new dataset.
                                </FieldDescription>
                              </FieldGroup>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className={cn("lg:hidden", (flow.step === 2 || flow.step === 3) && "hidden")}>
                  <Button variant="ghost" onClick={() => setDetails((value) => !value)} aria-expanded={details}>
                    {details ? "Hide context" : "View context"}
                  </Button>
                  {details && (
                    <dl className="mt-3 flex flex-col gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground text-xs">Project</dt>
                        <dd>{project.name}</dd>
                      </div>
                      {flow.connection && (
                        <div>
                          <dt className="text-muted-foreground text-xs">Connection</dt>
                          <dd>{flow.connection.name}</dd>
                        </div>
                      )}
                      {flow.source && (
                        <div>
                          <dt className="text-muted-foreground text-xs">Source</dt>
                          <dd className="break-all">
                            {flow.source.type === "table"
                              ? `${flow.source.schema}.${flow.source.name}`
                              : "SELECT query"}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              </div>
            </main>
            {flow.step !== 2 && <FlowContext flow={flow} project={project} />}
          </div>
        </DialogContent>
      </FocusScope>
    </Dialog>
  );
}
