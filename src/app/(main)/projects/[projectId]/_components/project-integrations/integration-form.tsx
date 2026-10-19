"use client";

import { useId, useState } from "react";

import { Check, ChevronDown, ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import type {
  IntegrationCatalog,
  ProjectIntegration,
  UpdateIntegrationRequest,
} from "@/lib/api/services/fetch-project-integrations";

import { useUnsavedWarning } from "../settings-panel";
import { ProviderMark } from "./provider-mark";
import type { IntegrationActions } from "./use-integration-actions";

export function IntegrationForm({
  catalog,
  providerKey,
  integration,
  repair = false,
  actions,
  onClose,
}: {
  catalog: IntegrationCatalog;
  providerKey: string;
  integration?: ProjectIntegration;
  repair?: boolean;
  actions: IntegrationActions;
  onClose: () => void;
}) {
  const id = useId();
  const provider = catalog.providers.find((item) => item.key === providerKey);
  const initialName = integration?.name ?? `${provider?.label ?? "Project"} updates`;
  const [step, setStep] = useState<"connection" | "notifications">("connection");
  const [name, setName] = useState(initialName);
  const [webhook, setWebhook] = useState("");
  const [visible, setVisible] = useState(false);
  const [events, setEvents] = useState(
    integration?.events ?? catalog.events.filter((event) => event.default).map((event) => event.key),
  );
  const [enabled, setEnabled] = useState(repair || !integration ? true : integration.status === "active");
  const [tested, setTested] = useState("");
  const url = webhook.trim();
  const needsTest = !integration || Boolean(url);
  const busy = actions.pending || actions.testing;
  const connecting = step === "connection";
  const dirty =
    name !== initialName ||
    Boolean(url) ||
    (integration
      ? events.join() !== integration.events.join() || enabled !== (integration.status === "active")
      : false);
  useUnsavedWarning(dirty);

  const connectionValid = () => {
    if (!name.trim() || name.trim().length > 80) {
      toast.error("Enter an integration name between 1 and 80 characters.");
      return false;
    }
    if (!provider) {
      toast.error("This provider is no longer available. Close the form and reload integrations.");
      return false;
    }
    if ((!integration || repair) && !url) {
      toast.error("Paste the webhook URL for your channel.");
      return false;
    }
    return true;
  };

  const next = async () => {
    if (!connectionValid() || !provider) return;
    if (needsTest && tested !== url) {
      if (actions.testBlocked) return;
      setTested("");
      if (!(await actions.test({ provider: providerKey, webhook_url: url }, provider.label))) return;
      setTested(url);
    }
    setStep("notifications");
  };

  const save = async () => {
    if (!connectionValid()) return;
    if (!events.length) {
      toast.error("Select at least one notification to send.");
      return;
    }
    if (needsTest && tested !== url) {
      setStep("connection");
      return;
    }
    if (!integration) {
      const result = await actions.create({
        provider: providerKey,
        name: name.trim(),
        webhook_url: url,
        events,
        enabled,
      });
      if (result) onClose();
      return;
    }
    const patch: UpdateIntegrationRequest = {};
    if (name.trim() !== integration.name) patch.name = name.trim();
    if (url) patch.webhook_url = url;
    if (events.join() !== integration.events.join()) patch.events = events;
    if (repair) patch.enabled = true;
    else if (enabled !== (integration.status === "active")) patch.enabled = enabled;
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    const result = await actions.update(integration.id, patch, name.trim());
    if (result) onClose();
  };

  const description = connecting
    ? "Give this connection a name and link your chat channel."
    : "Choose the project updates to send to this channel.";
  const saveLabel = integration ? "Save changes" : "Connect channel";
  const continueLabel = actions.retryAt && needsTest && tested !== url ? "Wait to try again" : "Continue";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] min-w-0 flex-col overflow-hidden sm:max-w-lg"
        showCloseButton={!busy}
      >
        <DialogHeader className="pr-6">
          <div className="flex min-w-0 items-center gap-3">
            <ProviderMark provider={providerKey} />
            <div className="flex min-w-0 flex-col gap-1.5">
              <DialogTitle>
                {integration ? "Manage" : "Connect"} {provider?.label ?? providerKey}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <fieldset aria-label="Connection setup progress" className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5" aria-current={connecting ? "step" : undefined}>
            {!connecting && <Check className="size-3.5" aria-hidden="true" />}
            Connection
          </span>
          <span aria-hidden="true" className="h-px w-5 bg-border" />
          <span
            className={connecting ? "text-muted-foreground" : undefined}
            aria-current={!connecting ? "step" : undefined}
          >
            Notifications
          </span>
        </fieldset>
        <form
          id={`${id}-form`}
          noValidate
          className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-0.5 pb-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void (connecting ? next() : save());
          }}
        >
          <FieldSet disabled={busy} className="min-w-0">
            {connecting ? (
              <FieldGroup className="min-w-0">
                <Field>
                  <FieldLabel htmlFor={`${id}-name`}>Connection name</FieldLabel>
                  <Input
                    id={`${id}-name`}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    autoComplete="off"
                    required
                    autoFocus={!repair}
                  />
                </Field>
                <Field className="min-w-0">
                  <FieldLabel htmlFor={`${id}-url`}>Webhook URL</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={`${id}-url`}
                      type={visible ? "text" : "password"}
                      value={webhook}
                      onChange={(event) => {
                        setWebhook(event.target.value);
                        setTested("");
                        if (integration?.status === "error" && event.target.value.trim()) setEnabled(true);
                      }}
                      placeholder={integration ? "Leave empty to keep the current URL" : provider?.url_placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoFocus={repair}
                      disabled={busy}
                      required={!integration || repair}
                      className="min-w-0"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        aria-label={visible ? "Hide webhook URL" : "Show webhook URL"}
                        aria-pressed={visible}
                        onClick={() => setVisible(!visible)}
                      >
                        {visible ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription className="break-words [overflow-wrap:anywhere]">
                    {integration
                      ? `Current: ${integration.url_hint}. Leave blank to keep it.`
                      : "We'll send a test message to verify your channel when you continue."}
                  </FieldDescription>
                </Field>
                {provider && (
                  <Collapsible className="min-w-0 rounded-lg border">
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" className="group w-full justify-between px-3">
                        How to get a webhook URL
                        <ChevronDown
                          data-icon="inline-end"
                          className="transition-transform group-data-[state=open]:rotate-180"
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex min-w-0 flex-col items-start gap-2 px-3 pt-1 pb-3">
                        <ol className="flex list-decimal flex-col gap-2 pl-4 text-muted-foreground text-sm">
                          {provider.setup_steps.map((instruction, index) => (
                            <li key={`${provider.key}-${index}`} className="break-words [overflow-wrap:anywhere]">
                              {instruction}
                            </li>
                          ))}
                        </ol>
                        <Button asChild variant="link" size="sm">
                          <a href={provider.docs_url} target="_blank" rel="noopener noreferrer">
                            Open {provider.label} guide
                            <ExternalLink data-icon="inline-end" />
                          </a>
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </FieldGroup>
            ) : (
              <FieldGroup className="min-w-0">
                <FieldSet className="min-w-0 gap-3">
                  <FieldLegend className="sr-only">Project notifications</FieldLegend>
                  <FieldGroup className="gap-0 rounded-lg border px-3">
                    {catalog.events.map((item) => (
                      <Field key={item.key} orientation="horizontal" className="min-w-0 border-b py-3 last:border-b-0">
                        <Checkbox
                          id={`${id}-${item.key}`}
                          checked={events.includes(item.key)}
                          onCheckedChange={(checked) => {
                            setEvents((current) =>
                              catalog.events
                                .filter((entry) =>
                                  entry.key === item.key ? checked === true : current.includes(entry.key),
                                )
                                .map((entry) => entry.key),
                            );
                          }}
                        />
                        <FieldContent className="min-w-0">
                          <FieldLabel htmlFor={`${id}-${item.key}`}>{item.label}</FieldLabel>
                          <FieldDescription>{item.description}</FieldDescription>
                        </FieldContent>
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>
                {integration && !repair && (
                  <Field orientation="horizontal">
                    <FieldContent className="min-w-0">
                      <FieldLabel htmlFor={`${id}-enabled`}>Enabled</FieldLabel>
                      <FieldDescription>Updates missed while paused won't be sent later.</FieldDescription>
                    </FieldContent>
                    <Switch id={`${id}-enabled`} checked={enabled} onCheckedChange={setEnabled} />
                  </Field>
                )}
              </FieldGroup>
            )}
          </FieldSet>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => (connecting ? onClose() : setStep("connection"))}
          >
            {connecting ? "Cancel" : "Back"}
          </Button>
          <Button
            type="submit"
            form={`${id}-form`}
            disabled={busy || (connecting && needsTest && tested !== url && actions.testBlocked)}
          >
            {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {actions.testing && "Testing connection…"}
            {actions.pending && "Saving…"}
            {!busy && (connecting ? continueLabel : saveLabel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
