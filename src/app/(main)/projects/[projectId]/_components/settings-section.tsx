"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "cn";
import { Archive, Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRestoreProjectMutation, useUpdateProjectMutation } from "@/hooks/use-projects-query";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { ProjectStatus } from "@/types/enums";

import { SettingsActivity } from "./settings-activity";
import {
  SettingsAccess,
  SettingsData,
  SettingsIntegrations,
  SettingsLiterature,
  SettingsModels,
  SettingsReview,
} from "./settings-extra";
import { ChoiceRow, notStoredYet, useDraft } from "./settings-kit";
import { SettingsDangerZone, StatusRow } from "./settings-lifecycle";
import {
  CharacterCount,
  SaveBar,
  SettingsGroup,
  SettingsHeading,
  SettingsRow,
  TagInput,
  useUnsavedWarning,
} from "./settings-panel";
import { SettingsNotifications, SettingsRuns, SettingsSpending } from "./settings-system";
import { perform, type WorkspaceProps } from "./workspace-ui";

const GROUPS: { label: string; tabs: { id: string; label: string }[] }[] = [
  {
    label: "Project",
    tabs: [
      { id: "general", label: "General" },
      { id: "access", label: "Members & access" },
    ],
  },
  {
    label: "Research",
    tabs: [
      { id: "runs", label: "Research runs" },
      { id: "models", label: "AI models" },
      { id: "literature", label: "Literature" },
      { id: "review", label: "Review & publishing" },
    ],
  },
  {
    label: "Data",
    tabs: [
      { id: "data", label: "Data & storage" },
      { id: "integrations", label: "Integrations" },
    ],
  },
  {
    label: "Workspace",
    tabs: [
      { id: "spending", label: "Spending" },
      { id: "notifications", label: "Notifications" },
      { id: "activity", label: "Activity" },
    ],
  },
  { label: "", tabs: [{ id: "danger", label: "Danger zone" }] },
];
const TABS = GROUPS.flatMap((group) => group.tabs);
type Tab = string;

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <div className="flex min-w-0 items-center gap-1 sm:pt-0.5">
      <code className="min-w-0 truncate font-mono text-muted-foreground text-sm">{value}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground"
        aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
        onClick={() =>
          navigator.clipboard.writeText(value).then(
            () => setCopied(true),
            () => toast.error("Couldn't copy to the clipboard."),
          )
        }
      >
        {copied ? <Check className="text-emerald-600" /> : <Copy />}
      </Button>
    </div>
  );
}

const TIME_ZONES = [
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City (GMT+7)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Europe/London", label: "London (GMT+0)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)" },
  { value: "America/New_York", label: "New York (GMT−5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT−8)" },
  { value: "UTC", label: "UTC" },
];

const sameTags = (a: string[], b: string[]) => a.length === b.length && a.every((tag, index) => tag === b[index]);

/** Everything that describes the project, edited and saved together. */
function GeneralTab({ project, readOnly }: { project: ProjectItem; readOnly: boolean }) {
  const router = useRouter();
  const save = useUpdateProjectMutation(project.id);
  const initial = {
    name: project.name,
    description: project.description ?? "",
    objective: project.objective ?? "",
    domain: project.domain ?? "",
    tags: project.tags,
  };
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [objective, setObjective] = useState(initial.objective);
  const [domain, setDomain] = useState(initial.domain);
  const [tags, setTags] = useState(initial.tags);
  const dirty =
    name.trim() !== initial.name ||
    description.trim() !== initial.description.trim() ||
    objective.trim() !== initial.objective.trim() ||
    domain.trim() !== initial.domain.trim() ||
    !sameTags(tags, initial.tags);
  const prefs = useDraft({ visibility: "members", timezone: "Asia/Ho_Chi_Minh", language: "en" });
  useUnsavedWarning(dirty);

  const discard = () => {
    prefs.discard();
    setName(initial.name);
    setDescription(initial.description);
    setObjective(initial.objective);
    setDomain(initial.domain);
    setTags(initial.tags);
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingsHeading title="General" />
      <form
        id="settings-general"
        noValidate
        className="flex flex-col gap-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (trimmed.length < 2) return void toast.error("The project name needs at least 2 characters.");
          if (trimmed.length > 160) return void toast.error("The project name can be up to 160 characters.");
          if (description.length > 5000) return void toast.error("The description can be up to 5,000 characters.");
          if (objective.length > 10000) return void toast.error("The objective can be up to 10,000 characters.");
          if (domain.trim().length > 160) return void toast.error("The domain can be up to 160 characters.");
          if (prefs.dirty) notStoredYet("visibility, time zone and language");
          if (!dirty) return;
          const data = {
            name: trimmed,
            description: description.trim() || null,
            objective: objective.trim() || null,
            domain: domain.trim() || null,
            tags,
          };
          if (!(await perform(() => save.mutateAsync(data), { title: "Project saved", description: trimmed }))) return;
          setName(trimmed);
          setDescription(description.trim());
          setObjective(objective.trim());
          setDomain(domain.trim());
          router.refresh();
        }}
      >
        <SettingsGroup>
          <SettingsRow label="Name" htmlFor="settings-name">
            <Input
              id="settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={readOnly}
              autoComplete="off"
            />
            <CharacterCount length={name.length} max={160} />
          </SettingsRow>
          <SettingsRow label="Description" htmlFor="settings-description">
            <Textarea
              id="settings-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={readOnly}
              placeholder="What is this project about?"
              className="min-h-20"
            />
            <CharacterCount length={description.length} max={5000} />
          </SettingsRow>
        </SettingsGroup>
        <SettingsGroup title="Research">
          <SettingsRow
            label="Objective"
            htmlFor="settings-objective"
            hint="The question the project sets out to answer."
          >
            <Textarea
              id="settings-objective"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              disabled={readOnly}
              placeholder="e.g. Which store and weather factors drive weekly demand for fresh produce?"
              className="min-h-20"
            />
            <CharacterCount length={objective.length} max={10000} />
          </SettingsRow>
          <SettingsRow label="Domain" htmlFor="settings-domain">
            <Input
              id="settings-domain"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              disabled={readOnly}
              placeholder="e.g. Retail forecasting"
            />
          </SettingsRow>
          <SettingsRow label="Tags" htmlFor="settings-tags" hint="Up to 20.">
            <TagInput id="settings-tags" value={tags} onChange={setTags} disabled={readOnly} />
          </SettingsRow>
        </SettingsGroup>
      </form>
      <SettingsGroup title="Workspace">
        <ChoiceRow
          id="settings-visibility"
          label="Visibility"
          value={prefs.values.visibility}
          onChange={prefs.set("visibility")}
          disabled={readOnly}
          wide
          options={[
            { value: "members", label: "Members only" },
            { value: "organization", label: "Everyone in the organization can view" },
          ]}
        />
        <ChoiceRow
          id="settings-timezone"
          label="Time zone"
          hint="For schedules, digests and dates in exports."
          value={prefs.values.timezone}
          onChange={prefs.set("timezone")}
          disabled={readOnly}
          wide
          options={TIME_ZONES}
        />
        <ChoiceRow
          id="settings-language"
          label="Language"
          hint="For dates and numbers in reports."
          value={prefs.values.language}
          onChange={prefs.set("language")}
          disabled={readOnly}
          options={[
            { value: "en", label: "English" },
            { value: "vi", label: "Vietnamese" },
          ]}
        />
      </SettingsGroup>
      <SettingsGroup title="About">
        <StatusRow project={project} />
        <SettingsRow label="Project ID">
          <CopyValue value={project.id} label="Project ID" />
        </SettingsRow>
        <SettingsRow label="Created">
          <p className="text-muted-foreground text-sm sm:pt-1.5">
            {new Date(project.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Copy and export">
        <SettingsRow label="Export" hint="Datasets, papers, run files and the activity log in one archive." inline>
          <Button type="button" variant="outline" size="sm" onClick={() => notStoredYet("project exports")}>
            Export data
          </Button>
        </SettingsRow>
        <SettingsRow label="Duplicate" hint="A new project with these settings and brief, without data or runs." inline>
          <Button type="button" variant="outline" size="sm" onClick={() => notStoredYet("project copies")}>
            Duplicate
          </Button>
        </SettingsRow>
      </SettingsGroup>
      <SaveBar dirty={dirty || prefs.dirty} pending={save.isPending} form="settings-general" onDiscard={discard} />
    </div>
  );
}

function ArchivedNotice({ project }: { project: ProjectItem }) {
  const router = useRouter();
  const restore = useRestoreProjectMutation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 py-2.5 pr-2.5 pl-4">
      <p className="flex items-center gap-2.5 text-sm">
        <Archive className="size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
        This project is archived and read only.
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={restore.isPending}
        onClick={async () => {
          if (
            await perform(() => restore.mutateAsync(project.id), {
              title: "Project restored",
              description: project.name,
            })
          )
            router.refresh();
        }}
      >
        Restore
      </Button>
    </div>
  );
}

function TabLink({ id, label, active }: { id: Tab; label: string; active: boolean }) {
  const danger = id === "danger";
  return (
    <Link
      href={`?tab=${id}`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 shrink-0 items-center whitespace-nowrap rounded-md px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-sidebar-accent font-medium" : "hover:bg-sidebar-accent/60",
        danger
          ? "text-red-600 dark:text-red-400"
          : active
            ? "text-sidebar-accent-foreground"
            : "text-foreground/75 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function SettingsSection({ project, userId }: WorkspaceProps) {
  const archived = project.status === ProjectStatus.Archived;
  const requested = useSearchParams().get("tab");
  const tab: Tab = TABS.find((item) => item.id === requested)?.id ?? "general";
  const row = useRef<HTMLUListElement>(null);
  // Keep the open tab in view in the phone's scrolling row.
  useEffect(() => {
    const list = row.current;
    const link = list?.querySelector<HTMLElement>(`a[href="?tab=${tab}"]`);
    if (list && link && list.scrollWidth > list.clientWidth)
      list.scrollTo({ left: link.offsetLeft - 16, behavior: "smooth" });
  }, [tab]);

  return (
    <div className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="Settings" className="min-w-0">
        <ul ref={row} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
          {TABS.map((item) => (
            <li key={item.id}>
              <TabLink id={item.id} label={item.label} active={tab === item.id} />
            </li>
          ))}
        </ul>
        <div className="sticky top-6 hidden flex-col gap-5 lg:flex">
          {GROUPS.map((group) => (
            <div key={group.label || "danger"} className={cn("flex flex-col gap-0.5", !group.label && "border-t pt-5")}>
              {group.label && (
                <p className="px-2.5 pb-1 font-semibold text-foreground text-xs uppercase tracking-wide">
                  {group.label}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.tabs.map((item) => (
                  <li key={item.id}>
                    <TabLink id={item.id} label={item.label} active={tab === item.id} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <div key={tab} className="fade-in-0 flex min-w-0 max-w-3xl animate-in flex-col gap-6 duration-200">
        {archived && <ArchivedNotice project={project} />}
        {tab === "general" && <GeneralTab project={project} readOnly={archived} />}
        {tab === "access" && <SettingsAccess projectId={project.id} readOnly={archived} />}
        {tab === "runs" && <SettingsRuns readOnly={archived} />}
        {tab === "models" && <SettingsModels readOnly={archived} />}
        {tab === "literature" && <SettingsLiterature readOnly={archived} />}
        {tab === "review" && <SettingsReview readOnly={archived} />}
        {tab === "data" && <SettingsData readOnly={archived} />}
        {tab === "integrations" && <SettingsIntegrations readOnly={archived} />}
        {tab === "spending" && <SettingsSpending readOnly={archived} />}
        {tab === "notifications" && <SettingsNotifications />}
        {tab === "activity" && <SettingsActivity project={project} userId={userId} />}
        {tab === "danger" && <SettingsDangerZone project={project} userId={userId} />}
      </div>
    </div>
  );
}
