"use client";

import { useState } from "react";

import { FocusScope } from "@radix-ui/react-focus-scope";
import { cn } from "cn";
import { ArrowLeft, Check, PlugZap } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/header/theme-switcher";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

import { CONNECTION_PROVIDERS, ConnectionLogo, connectionSourceLabel } from "./connection-display";
import { ConnectionForm, ConnectionGuidance } from "./connection-form";
import { ConnectionPreviewStep } from "./connection-preview-step";
import { ConnectionCatalogRefresh, ConnectionSourceControls, ConnectionSourceStep } from "./connection-source-step";
import { GoogleReconnectButton } from "./google-reconnect-button";
import { type ConnectionFlowState, type ConnectionStep, useConnectionFlow } from "./use-connection-flow";

const STAGES: Record<ConnectionStep, { label: string; title: string; purpose: string }> = {
  1: {
    label: "Connect",
    title: "Connect your data source",
    purpose: "Enter connection details. We will check access before saving.",
  },
  2: {
    label: "Source",
    title: "Choose your data source",
    purpose: "Pick a table or write a SELECT query to define the data you need.",
  },
  3: {
    label: "Review and import",
    title: "Review and import",
    purpose: "Check the columns and sample rows, name the dataset, then import it.",
  },
};

// A new source connects first; a saved one starts at its source, then one step to review and import.
function flowStages(flow: ConnectionFlowState) {
  const steps: ConnectionStep[] = flow.connection ? [2, 3] : [1, 2, 3];
  return steps.map((step) => ({ ...STAGES[step], step }));
}

function flowName(flow: ConnectionFlowState) {
  return `Import from ${CONNECTION_PROVIDERS[flow.kind].label}`;
}

function currentStage(flow: ConnectionFlowState) {
  const stage = STAGES[flow.step];
  if (flow.step === 1) return { ...stage, title: `Connect ${CONNECTION_PROVIDERS[flow.kind].label}` };
  if (flow.isTimeSeries && flow.step === 2)
    return {
      ...stage,
      purpose: "Choose a metric or measurement, fields, tags and a time range.",
    };
  return flow.isGoogle && flow.step === 2
    ? { ...stage, purpose: "Choose a file or spreadsheet tab to import." }
    : stage;
}

function StageTrack({ flow }: { flow: ConnectionFlowState }) {
  if (flowStages(flow).length < 2) return null;
  return (
    <nav aria-label="Import progress" className="shrink-0 overflow-x-auto border-b px-4 py-3.5 md:px-6">
      <ol className="grid auto-cols-fr grid-flow-col gap-2">
        {flowStages(flow).map((stage, index) => {
          const done = stage.step < flow.step;
          const current = stage.step === flow.step;
          return (
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
                aria-current={current ? "step" : undefined}
                className="flex min-h-9 w-full flex-col justify-center gap-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap text-xs",
                    done || current ? "text-foreground" : "text-muted-foreground",
                    current && "font-semibold",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" aria-label="Done" />
                  ) : (
                    <span className="hidden font-mono text-muted-foreground sm:inline">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  {stage.label}
                </span>
                <span
                  className={cn(
                    "h-1 w-full rounded-full transition-colors duration-300",
                    "bg-muted",
                    done && "bg-foreground/35",
                    current && "bg-foreground",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function FlowContext({ flow, project }: { flow: ConnectionFlowState; project: ProjectItem }) {
  const facts = [
    ...(flow.connection
      ? [
          {
            label: "Connection",
            value: `${flow.connection.name} · ${CONNECTION_PROVIDERS[flow.connection.kind].label}`,
          },
        ]
      : flow.step === 1
        ? [{ label: "Provider", value: CONNECTION_PROVIDERS[flow.kind].label }]
        : []),
    ...(flow.source
      ? [
          {
            label: "Source",
            value: connectionSourceLabel(flow.source),
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
        {flow.step === 1 && (
          <>
            <Separator />
            <ConnectionGuidance kind={flow.kind} ssl={flow.draft.ssl} compact />
          </>
        )}
      </aside>
    </ScrollArea>
  );
}

function FlowActions({
  flow,
  placement = "footer",
  onClose,
}: {
  flow: ConnectionFlowState;
  placement?: "header" | "footer";
  /** Back from connecting or choosing a source returns to the connections page, where the provider was picked. */
  onClose: () => void;
}) {
  let label = "Import dataset";
  if (flow.step === 1) label = "Connect and continue";
  else if (flow.step === 2) label = "Preview";
  else if (flow.reconcileRequired) label = "Reload datasets";
  const next = () => {
    if (flow.step === 1) void flow.connect();
    else if (flow.step === 2) void flow.previewSource();
    else if (flow.reconcileRequired) void flow.reconcileImport();
    else void flow.importDataset();
  };
  // The first step of a flow leaves it, so it cancels rather than goes back.
  const leaves = flow.step <= 2;
  const Container = placement === "header" ? "div" : "footer";
  return (
    <Container
      className={cn(
        "flex items-center gap-2",
        placement === "header" ? "justify-end" : "justify-between border-t pt-5",
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="px-4"
        disabled={flow.busy || flow.reconcileRequired}
        onClick={() => (leaves ? onClose() : flow.setStep((flow.step - 1) as ConnectionStep))}
      >
        {leaves ? "Cancel" : "Back"}
      </Button>
      {(flow.configured || flow.reconcileRequired) && (
        <Button
          type="button"
          size="lg"
          className="px-4"
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
          {(flow.busy && { 1: "Connecting…", 3: "Importing…" }[flow.step as 1 | 3]) || label}
        </Button>
      )}
    </Container>
  );
}

export function ConnectionFlow({
  project,
  initialConnection,
  initialKind,
  canWrite,
  onClose,
  onComplete,
  backLabel = "Data connections",
}: {
  project: ProjectItem;
  initialConnection?: ConnectionItem;
  initialKind?: ConnectionKind;
  canWrite: boolean;
  onClose: () => void;
  onComplete: (dataset: DatasetItem) => void;
  /** The page the back button returns to. */
  backLabel?: string;
}) {
  const flow = useConnectionFlow(project.id, initialConnection, onComplete, canWrite, initialKind);
  const reduceMotion = useReducedMotion();
  const [details, setDetails] = useState(false);
  const stage = currentStage(flow);
  const close = () => {
    if (!flow.busy) onClose();
  };

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
        trapped
        onMountAutoFocus={(event) => event.preventDefault()}
        onUnmountAutoFocus={(event) => event.preventDefault()}
      >
        <DialogContent
          showCloseButton={false}
          aria-modal
          className="top-0 left-0 flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-background p-0 data-open:animate-none data-closed:animate-none sm:max-w-none"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (flow.busy) event.preventDefault();
          }}
        >
          <DialogTitle className="sr-only">
            {flowName(flow)} — {stage.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {flow.connection
              ? "Choose data from a saved connection, preview it and import it as a dataset."
              : "Connect an external data source, then choose data from it, preview it and import it as a dataset."}
          </DialogDescription>
          <header className="flex min-h-14 shrink-0 items-center gap-3 border-b px-4 py-2 md:px-5">
            <Button variant="ghost" disabled={flow.busy} onClick={close}>
              <ArrowLeft data-icon="inline-start" />
              {backLabel}
            </Button>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span className="hidden min-w-0 truncate text-sm sm:block">
              <span className="font-medium">{flowName(flow)}</span>
              <span className="hidden text-muted-foreground md:inline"> · {project.name}</span>
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs" role="status">
              {flow.busy && <Spinner className="size-3.5" />}
              {flow.busy && "Working…"}
              {!flow.busy && Boolean(flow.waitSeconds) && `Wait ${flow.waitSeconds}s`}
            </span>
            <ThemeSwitcher />
          </header>
          <StageTrack flow={flow} />
          {!flow.configured && (
            <Alert className="mx-4 mt-4 w-auto md:mx-8">
              <PlugZap />
              <AlertTitle>Data connections are turned off</AlertTitle>
              <AlertDescription>
                This server is not set up to connect external data sources. Contact your administrator to enable them.
              </AlertDescription>
            </Alert>
          )}
          <div
            className={cn(
              "grid min-h-0 flex-1 overflow-hidden",
              flow.step !== 2 && flow.step !== 3 && "lg:grid-cols-[minmax(0,1fr)_320px]",
            )}
          >
            <main
              className={cn(
                "flex min-h-0 min-w-0 flex-col px-4 md:px-8",
                flow.step === 2 ? "gap-3 pt-4" : "gap-6 pt-6",
                flow.step === 2 && flow.isTimeSeries && "px-3 md:px-4",
              )}
            >
              {!(flow.step === 2 && flow.isTimeSeries) && (
                <header
                  className={cn(
                    "grid shrink-0 gap-3 border-b",
                    flow.step === 2
                      ? "grid-cols-1 items-center pb-3 lg:grid-cols-[minmax(0,1fr)_auto]"
                      : "grid-cols-1 items-start pb-5 md:grid-cols-[minmax(0,1fr)_auto]",
                  )}
                >
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
                      <p className="mt-1 max-w-[68ch] text-pretty text-muted-foreground text-sm">{stage.purpose}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 justify-self-end">
                    {flow.step === 2 && <ConnectionSourceControls flow={flow} />}
                    {flow.needsReauthorization && flow.connection && canWrite && (
                      <GoogleReconnectButton
                        projectId={project.id}
                        connectionId={flow.connection.id}
                        accountEmail={String(flow.connection.config.account_email ?? "")}
                        disabled={flow.busy}
                      />
                    )}
                    {flow.step === 2 && <ConnectionCatalogRefresh flow={flow} />}
                    {!(flow.isTimeSeries && flow.step === 2) && (
                      <FlowActions flow={flow} placement="header" onClose={close} />
                    )}
                  </div>
                </header>
              )}
              <div
                className={cn(
                  "min-h-0 flex-1 px-1 pt-1",
                  flow.step === 2
                    ? "overflow-hidden pb-4"
                    : flow.step === 3
                      ? "overflow-y-auto overscroll-contain pb-4 lg:overflow-hidden"
                      : "overflow-y-auto overscroll-contain pb-8",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={flow.step}
                    className={cn(
                      "flex min-w-0 flex-col gap-5",
                      flow.step === 2 && "h-full min-h-0",
                      flow.step === 3 && "lg:h-full lg:min-h-0",
                    )}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {flow.step === 1 && !isGoogleConnection(flow.kind) ? (
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
                      <div className="flex min-w-0 flex-col gap-5 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        <Card className="h-[min(32rem,70dvh)] w-full min-w-0 lg:h-full lg:min-h-0">
                          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col">
                            <ConnectionPreviewStep preview={flow.preview} timeSeries={flow.isTimeSeries} />
                          </CardContent>
                        </Card>
                        <section
                          aria-label="Dataset details"
                          className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain"
                        >
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
                        </section>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className={cn("shrink-0 lg:hidden", (flow.step === 2 || flow.step === 3) && "hidden")}>
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
                          <dd className="break-all">{connectionSourceLabel(flow.source)}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              </div>
            </main>
            {flow.step !== 2 && flow.step !== 3 && <FlowContext flow={flow} project={project} />}
          </div>
        </DialogContent>
      </FocusScope>
    </Dialog>
  );
}
