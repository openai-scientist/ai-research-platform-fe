"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Check, CircleAlert, Ellipsis, ExternalLink, KeyRound, PlugZap } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { adminKeys } from "@/lib/api/query-keys";
import {
  fetchAdmin,
  type IntegrationItem,
  type ModelProfile,
  type ModelRole,
  type ModelTestResult,
  type SaveModelRequest,
  type TestModelRequest,
} from "@/lib/api/services/fetch-admin";

import { timeAgo } from "../../projects/[projectId]/_components/dataset-format";
import { SectionCard } from "./admin-primitives";

export const RUN_MODEL_ROLES = ["stage", "review"] as const;

export const RUN_MODEL_DETAILS: Record<ModelRole, { title: string; description: string }> = {
  stage: {
    title: "Stage model",
    description: "Does the research: the goal, the searches, the cards, the debate and the hypotheses.",
  },
  review: {
    title: "Review model",
    description:
      "Reviews what the stage model wrote, before the researcher sees it. It must differ from the stage model.",
  },
};

export function KeyState({ saved, required }: { readonly saved: boolean; readonly required?: boolean }) {
  if (saved)
    return (
      <Badge
        variant="outline"
        className="gap-1 border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        <Check />
        Key saved
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className={
        required
          ? "gap-1 border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-transparent bg-muted text-muted-foreground"
      }
    >
      {required && <CircleAlert />}
      No key
    </Badge>
  );
}

function ModelForm({ role, profile }: { readonly role: ModelRole; readonly profile: ModelProfile | null }) {
  const id = useId();
  const [baseUrl, setBaseUrl] = useState(profile?.base_url ?? "");
  const [model, setModel] = useState(profile?.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const save = useApiMutation((body: SaveModelRequest) => fetchAdmin.saveModel(role, body), [adminKeys.models()]);
  const test = useApiMutation((body: TestModelRequest) => fetchAdmin.testModel(role, body));
  /** The last test that reached the model, for the values it was run with. */
  const [passed, setPassed] = useState<{ result: ModelTestResult; values: string } | null>(null);
  const values = `${baseUrl.trim()}\n${model.trim()}\n${apiKey.trim()}`;
  const changed =
    baseUrl.trim() !== (profile?.base_url ?? "") || model.trim() !== (profile?.model ?? "") || apiKey.trim() !== "";

  /** The form's values, or null after saying in a toast what is missing. */
  const filled = () => {
    const url = baseUrl.trim();
    if (!url) {
      toast.error("Enter the base URL.");
      return null;
    }
    if (!/^https?:\/\/\S+$/.test(url)) {
      toast.error("Enter the base URL as http:// or https://.");
      return null;
    }
    if (!model.trim()) {
      toast.error("Enter the model name.");
      return null;
    }
    return { base_url: url, model: model.trim(), ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}) };
  };

  const check = () => {
    const body = filled();
    if (!body) return;
    test.mutate(body, {
      onSuccess: ({ data: result }) => {
        if (!result.ok) {
          setPassed(null);
          toast.error(result.message);
          return;
        }
        setPassed({ result, values });
        toast.success(`${result.message} It took ${result.latency_ms} ms.`);
      },
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const body = filled();
    if (!body) return;
    save.mutate(
      {
        provider: "openai_compatible",
        base_url: body.base_url,
        model: body.model,
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      },
      {
        onSuccess: () => {
          setApiKey("");
          toast.success(`${RUN_MODEL_DETAILS[role].title} saved.`);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-4">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor={`${id}-url`}>Base URL</FieldLabel>
          <Input
            id={`${id}-url`}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
            autoComplete="off"
            inputMode="url"
          />
          <FieldDescription>The OpenAI-compatible endpoint the engines call, usually ending in /v1.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-model`}>Model</FieldLabel>
          <Input
            id={`${id}-model`}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-5"
            autoComplete="off"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-key`}>API key</FieldLabel>
          <div className="relative">
            <KeyRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${id}-key`}
              type="password"
              className="pl-9"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={profile?.has_api_key ? "Saved. Paste a new key to replace it" : "Paste the provider's key"}
              autoComplete="new-password"
            />
          </div>
          <FieldDescription>Stored encrypted. It is never shown again, only replaced.</FieldDescription>
        </Field>
      </FieldGroup>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        {passed?.values === values ? (
          <span className="flex items-center gap-1.5 text-emerald-700 text-xs dark:text-emerald-300">
            <Check className="size-3.5" />
            Connected · {passed.result.latency_ms} ms
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            {profile ? `Updated ${timeAgo(profile.updated_at)}` : "Not configured. Runs cannot start."}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={check} disabled={test.isPending}>
            {test.isPending ? <Spinner /> : <PlugZap />}
            Test connection
          </Button>
          <Button type="submit" size="sm" disabled={!changed || save.isPending}>
            {save.isPending && <Spinner />}
            Save {role} model
          </Button>
        </div>
      </div>
    </form>
  );
}

export function useRunModelProfiles() {
  return useApiQuery(adminKeys.models(), async (signal) => (await fetchAdmin.getModels(signal)).data);
}

/** The two models every run uses, as the Platform holds them (`/admin/models`). */
export function RunModelsSettings() {
  const { data, isError, isFetching, isPending, refetch } = useRunModelProfiles();
  if (isError && !data) {
    return (
      <div>
        <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          Retry loading model settings
        </Button>
      </div>
    );
  }

  return (
    // The two cards share their rows, so their headers and fields line up whatever the descriptions' length.
    <div className="grid gap-4 lg:grid-cols-2">
      {RUN_MODEL_ROLES.map((role) => {
        const profile = data?.[role] ?? null;
        return (
          <SectionCard
            key={role}
            className="lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:gap-0"
            title={RUN_MODEL_DETAILS[role].title}
            description={RUN_MODEL_DETAILS[role].description}
            action={!isPending && <KeyState saved={Boolean(profile?.has_api_key)} required />}
          >
            {isPending ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              // A saved profile resets the form to what the Platform now holds.
              <ModelForm key={profile?.updated_at ?? "new"} role={role} profile={profile} />
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

type IntegrationDefinition = {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly required?: boolean;
  readonly keyLink?: { href: string; label: string };
};

const INTEGRATIONS: IntegrationDefinition[] = [
  {
    name: "typesafe",
    label: "Typesafe",
    description: "Decision provider of the experiment design stage. Accepting hypotheses into that stage needs it.",
    required: true,
    keyLink: { href: "https://console.typesafe.ai/keys", label: "Get API key" },
  },
  {
    name: "openalex",
    label: "OpenAlex",
    description: "Literature search. A key raises the daily request limit.",
    keyLink: { href: "https://openalex.org/settings/api", label: "Get API key" },
  },
  {
    name: "semantic_scholar",
    label: "Semantic Scholar",
    description: "Literature search. Without a key, the shared rate limit often turns searches away.",
    keyLink: { href: "https://www.semanticscholar.org/product/api#api-key-form", label: "Request API key" },
  },
  {
    name: "huggingface",
    label: "Hugging Face",
    description: "Datasets and models the experiment design stage may use.",
    keyLink: { href: "https://huggingface.co/settings/tokens", label: "Create access token" },
  },
];

function IntegrationRow({
  name,
  label,
  description,
  keyLink,
  required,
  saved,
}: IntegrationDefinition & { readonly saved: IntegrationItem | undefined }) {
  const id = useId();
  const editButton = useRef<HTMLButtonElement>(null);
  const keyInput = useRef<HTMLInputElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const restoreEditorFocus = useRef(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [removing, setRemoving] = useState(false);
  const invalidate = [adminKeys.integrations()];
  const save = useApiMutation((key: string) => fetchAdmin.saveIntegration(name, key), invalidate);
  const remove = useApiMutation(() => fetchAdmin.deleteIntegration(name), invalidate);
  const editLabel = saved ? "Replace key" : "Add API key";

  useEffect(() => {
    if (editing) {
      keyInput.current?.focus();
    } else if (restoreEditorFocus.current) {
      restoreEditorFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  const closeEditor = () => {
    restoreEditorFocus.current = true;
    setEditing(false);
    setValue("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    if (!value.trim()) {
      toast.error(`Paste the ${label} key.`);
      return;
    }
    save.mutate(value.trim(), {
      onSuccess: () => {
        closeEditor();
        toast.success(`${label} key saved.`);
      },
    });
  };

  return (
    <li className="grid gap-3 py-3.5 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center md:gap-x-6">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          {required && (
            <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
              Required
            </Badge>
          )}
          <KeyState saved={Boolean(saved)} required={required} />
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
        {(keyLink ?? saved?.updated_at) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
            {keyLink && (
              <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                <a href={keyLink.href} target="_blank" rel="noopener noreferrer">
                  {keyLink.label}
                  <span className="sr-only"> for {label} (opens in a new tab)</span>
                  <ExternalLink data-icon="inline-end" aria-hidden="true" />
                </a>
              </Button>
            )}
            {saved?.updated_at && <span>Updated {timeAgo(saved.updated_at)}</span>}
          </div>
        )}
      </div>
      {editing ? (
        <form onSubmit={submit} className="flex min-w-0 flex-wrap items-center gap-2">
          <label htmlFor={id} className="sr-only">
            {label} API key
          </label>
          <Input
            ref={keyInput}
            id={id}
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={saved ? "Paste the new API key" : "Paste the API key"}
            autoComplete="new-password"
            className="min-w-0 flex-1 basis-32"
            readOnly={save.isPending}
          />
          <Button type="submit" size="sm" disabled={!value.trim() || save.isPending}>
            {save.isPending && <Spinner />}
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={closeEditor} disabled={save.isPending}>
            Cancel
          </Button>
        </form>
      ) : (
        <div className="grid grid-cols-[auto_1.75rem] items-center justify-start gap-2 md:justify-end">
          <Button
            ref={editButton}
            type="button"
            variant="outline"
            size="sm"
            aria-label={`${editLabel} for ${label}`}
            disabled={remove.isPending}
            onClick={() => setEditing(true)}
          >
            {editLabel}
          </Button>
          {saved && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  ref={menuButton}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`More actions for ${label}`}
                  disabled={remove.isPending}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onCloseAutoFocus={(event) => {
                  if (removing) event.preventDefault();
                }}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(true)}>
                    Remove key
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (menuButton.current ?? editButton.current)?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the {label} key?</AlertDialogTitle>
            <AlertDialogDescription>
              {required
                ? "Hypotheses can no longer be accepted into experiment design until a key is saved again."
                : "Runs go on without it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success(`${label} key removed.`) })}
            >
              Remove key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

/** Keys the engines use besides the models (`/admin/integrations`). */
export function IntegrationSettings() {
  const { data, isPending } = useApiQuery(
    adminKeys.integrations(),
    async (signal) => (await fetchAdmin.getIntegrations(signal)).data,
  );
  const saved = new Map((data ?? []).map((item) => [item.name, item]));
  const known = new Set(INTEGRATIONS.map((i) => i.name));
  const others = (data ?? [])
    .filter((item) => !known.has(item.name))
    .map((item) => ({ name: item.name, label: item.name, description: "Saved by an earlier setup." }));

  return (
    <SectionCard title="Integrations" description="Keys the research engines use besides the models.">
      {isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <ul className="divide-y">
          {[...INTEGRATIONS, ...others].map((item) => (
            <IntegrationRow key={item.name} {...item} saved={saved.get(item.name)} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
