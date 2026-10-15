"use client";

import { useState } from "react";

import { Copy, FolderGit2, Library, MessageSquare, RotateCw, Webhook } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  ChoiceRow,
  DraftTab,
  NumberRow,
  notStoredYet,
  type Option,
  ServiceRow,
  SwitchRow,
  useDraft,
} from "./settings-kit";
import { SettingsGroup, SettingsHeading, SettingsRow, TagInput } from "./settings-panel";

const ROLE_OPTIONS: Option[] = [
  { value: "researcher", label: "Researcher" },
  { value: "reviewer", label: "Reviewer" },
];

/** Who gets into the project, and how. */
export function SettingsAccess({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const draft = useDraft({
    inviters: "managers",
    defaultRole: "researcher",
    expiry: "7",
    domains: [] as string[],
    link: false,
    approval: true,
    reviewersSeeData: true,
  });
  const { values: v, set } = draft;
  const inviteLink = `${typeof window === "undefined" ? "" : window.location.origin}/join/${projectId.slice(0, 8)}`;

  return (
    <DraftTab id="access" title="Members & access" what="access settings" dirty={draft.dirty} onDiscard={draft.discard}>
      <SettingsGroup title="Invitations">
        <ChoiceRow
          id="access-inviters"
          label="Who can invite"
          value={v.inviters}
          onChange={set("inviters")}
          disabled={readOnly}
          wide
          options={[
            { value: "managers", label: "Managers only" },
            { value: "researchers", label: "Managers and researchers" },
          ]}
        />
        <ChoiceRow
          id="access-role"
          label="Default role"
          hint="Picked first in the invite form."
          value={v.defaultRole}
          onChange={set("defaultRole")}
          options={ROLE_OPTIONS}
          disabled={readOnly}
        />
        <ChoiceRow
          id="access-expiry"
          label="Invitations expire after"
          value={v.expiry}
          onChange={set("expiry")}
          disabled={readOnly}
          options={["3", "7", "14", "30"].map((days) => ({ value: days, label: `${days} days` }))}
        />
        <SettingsRow
          label="Allowed email domains"
          htmlFor="access-domains"
          hint="Leave empty to invite anyone with an account."
        >
          <TagInput id="access-domains" value={v.domains} onChange={set("domains")} disabled={readOnly} />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Invite link">
        <SwitchRow
          id="access-link"
          label="Join with a link"
          hint="Anyone signed in with the link can ask to join."
          checked={v.link}
          onChange={set("link")}
          disabled={readOnly}
        />
        {v.link && (
          <>
            <SettingsRow label="Link">
              <div className="flex min-w-0 items-center gap-1.5">
                <Input readOnly value={inviteLink} className="font-mono text-muted-foreground" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy invite link"
                  onClick={() =>
                    navigator.clipboard.writeText(inviteLink).then(
                      () => toast.success("Invite link copied."),
                      () => toast.error("Couldn't copy to the clipboard."),
                    )
                  }
                >
                  <Copy />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Make a new link"
                  onClick={() => notStoredYet("a new invite link")}
                >
                  <RotateCw />
                </Button>
              </div>
            </SettingsRow>
            <SwitchRow
              id="access-approval"
              label="Approve each request"
              hint="A manager accepts people who join with the link."
              checked={v.approval}
              onChange={set("approval")}
              disabled={readOnly}
            />
          </>
        )}
      </SettingsGroup>
      <SettingsGroup title="Reviewers">
        <SwitchRow
          id="access-reviewer-data"
          label="Reviewers can open datasets"
          hint="Off: reviewers see results and papers, not the raw data."
          checked={v.reviewersSeeData}
          onChange={set("reviewersSeeData")}
          disabled={readOnly}
        />
      </SettingsGroup>
    </DraftTab>
  );
}

const MODEL_OPTIONS: Option[] = [
  { value: "default", label: "Platform default" },
  { value: "claude-opus-5-5", label: "Claude Opus 5.5" },
  { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
  { value: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gemini-2-5-pro", label: "Gemini 2.5 Pro" },
];

/** Which AI models do the work and how they think. */
export function SettingsModels({ readOnly }: { readOnly: boolean }) {
  const draft = useDraft({
    stage: "default",
    review: "default",
    fallback: "none",
    effort: "medium",
    style: "balanced",
  });
  const { values: v, set } = draft;

  return (
    <DraftTab id="models" title="AI models" what="model settings" dirty={draft.dirty} onDiscard={draft.discard}>
      <SettingsGroup title="Models">
        <ChoiceRow
          id="models-stage"
          label="Research model"
          hint="Reads papers, writes hypotheses and code."
          value={v.stage}
          onChange={set("stage")}
          options={MODEL_OPTIONS}
          disabled={readOnly}
          wide
        />
        <ChoiceRow
          id="models-review"
          label="Review model"
          hint="Checks each stage's work before it moves on."
          value={v.review}
          onChange={set("review")}
          options={MODEL_OPTIONS}
          disabled={readOnly}
          wide
        />
        <ChoiceRow
          id="models-fallback"
          label="Fallback"
          hint="Used when the chosen model is unavailable."
          value={v.fallback}
          onChange={set("fallback")}
          options={[{ value: "none", label: "None, pause the run" }, ...MODEL_OPTIONS.slice(1)]}
          disabled={readOnly}
          wide
        />
      </SettingsGroup>
      <SettingsGroup title="Behaviour">
        <ChoiceRow
          id="models-effort"
          label="Reasoning effort"
          hint="More effort is slower and costs more."
          value={v.effort}
          onChange={set("effort")}
          disabled={readOnly}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
        <ChoiceRow
          id="models-style"
          label="Hypothesis style"
          value={v.style}
          onChange={set("style")}
          disabled={readOnly}
          options={[
            { value: "conservative", label: "Conservative" },
            { value: "balanced", label: "Balanced" },
            { value: "exploratory", label: "Exploratory" },
          ]}
        />
      </SettingsGroup>
    </DraftTab>
  );
}

const SOURCES = [
  { key: "arxiv", name: "arXiv", line: "Preprints in physics, maths and computer science." },
  { key: "semantic", name: "Semantic Scholar", line: "Papers across every field, with citations." },
  { key: "openalex", name: "OpenAlex", line: "An open index of scholarly works." },
  { key: "pubmed", name: "PubMed", line: "Biomedical and life-science literature." },
  { key: "crossref", name: "Crossref", line: "Metadata for papers with a DOI." },
] as const;

/** Where runs look for papers and which ones they keep. */
export function SettingsLiterature({ readOnly }: { readOnly: boolean }) {
  const draft = useDraft({
    arxiv: true,
    semantic: true,
    openalex: true,
    pubmed: false,
    crossref: false,
    years: "10",
    preprints: true,
    perRound: "40",
    languages: ["English"],
    exclude: [] as string[],
  });
  const { values: v, set } = draft;
  const anySource = SOURCES.some((source) => v[source.key]);

  return (
    <DraftTab
      id="literature"
      title="Literature"
      what="literature settings"
      dirty={draft.dirty}
      onDiscard={draft.discard}
      validate={() => {
        if (!anySource) return "Turn on at least one source.";
        const count = Number(v.perRound);
        if (!(count >= 5 && count <= 200)) return "Screen between 5 and 200 papers per round.";
      }}
    >
      <SettingsGroup title="Sources">
        {SOURCES.map((source) => (
          <SwitchRow
            key={source.key}
            id={`literature-${source.key}`}
            label={source.name}
            hint={source.line}
            checked={v[source.key]}
            onChange={set(source.key)}
            disabled={readOnly}
          />
        ))}
      </SettingsGroup>
      <SettingsGroup title="Filters">
        <ChoiceRow
          id="literature-years"
          label="Published within"
          value={v.years}
          onChange={set("years")}
          disabled={readOnly}
          options={[
            { value: "3", label: "Last 3 years" },
            { value: "5", label: "Last 5 years" },
            { value: "10", label: "Last 10 years" },
            { value: "any", label: "Any time" },
          ]}
        />
        <SwitchRow
          id="literature-preprints"
          label="Include preprints"
          hint="Papers not yet peer reviewed."
          checked={v.preprints}
          onChange={set("preprints")}
          disabled={readOnly}
        />
        <SettingsRow label="Paper languages" htmlFor="literature-languages">
          <TagInput id="literature-languages" value={v.languages} onChange={set("languages")} disabled={readOnly} />
        </SettingsRow>
        <SettingsRow label="Leave out" htmlFor="literature-exclude" hint="Venues, authors or keywords to skip.">
          <TagInput id="literature-exclude" value={v.exclude} onChange={set("exclude")} disabled={readOnly} />
        </SettingsRow>
        <NumberRow
          id="literature-per-round"
          label="Papers screened per round"
          value={v.perRound}
          onChange={set("perRound")}
          unit="papers"
          disabled={readOnly}
        />
      </SettingsGroup>
    </DraftTab>
  );
}

/** Who signs off on results, and what the finished paper looks like. */
export function SettingsReview({ readOnly }: { readOnly: boolean }) {
  const draft = useDraft({
    approvals: "1",
    approvers: "reviewers",
    selfApproval: false,
    format: "latex",
    citation: "apa",
    language: "en",
    appendix: true,
    watermark: true,
  });
  const { values: v, set } = draft;

  return (
    <DraftTab
      id="review"
      title="Review & publishing"
      what="review settings"
      dirty={draft.dirty}
      onDiscard={draft.discard}
    >
      <SettingsGroup title="Approvals">
        <ChoiceRow
          id="review-approvals"
          label="Approvals to publish"
          hint="How many people sign off before a paper is final."
          value={v.approvals}
          onChange={set("approvals")}
          disabled={readOnly}
          options={["1", "2", "3"].map((count) => ({
            value: count,
            label: `${count} ${count === "1" ? "approval" : "approvals"}`,
          }))}
        />
        <ChoiceRow
          id="review-approvers"
          label="Who can approve"
          value={v.approvers}
          onChange={set("approvers")}
          disabled={readOnly}
          wide
          options={[
            { value: "reviewers", label: "Reviewers" },
            { value: "reviewers-managers", label: "Reviewers and managers" },
            { value: "anyone", label: "Anyone in the project" },
          ]}
        />
        <SwitchRow
          id="review-self"
          label="Approve your own runs"
          hint="Off: someone other than the person who started the run has to approve it."
          checked={v.selfApproval}
          onChange={set("selfApproval")}
          disabled={readOnly}
        />
      </SettingsGroup>
      <SettingsGroup title="Paper">
        <ChoiceRow
          id="review-format"
          label="Format"
          value={v.format}
          onChange={set("format")}
          disabled={readOnly}
          options={[
            { value: "latex", label: "LaTeX (PDF)" },
            { value: "markdown", label: "Markdown" },
            { value: "docx", label: "Word" },
          ]}
        />
        <ChoiceRow
          id="review-citation"
          label="Citation style"
          value={v.citation}
          onChange={set("citation")}
          disabled={readOnly}
          options={[
            { value: "apa", label: "APA 7" },
            { value: "ieee", label: "IEEE" },
            { value: "chicago", label: "Chicago" },
            { value: "harvard", label: "Harvard" },
            { value: "vancouver", label: "Vancouver" },
          ]}
        />
        <ChoiceRow
          id="review-language"
          label="Language"
          value={v.language}
          onChange={set("language")}
          disabled={readOnly}
          options={[
            { value: "en", label: "English" },
            { value: "vi", label: "Vietnamese" },
            { value: "ja", label: "Japanese" },
            { value: "fr", label: "French" },
            { value: "de", label: "German" },
          ]}
        />
        <SwitchRow
          id="review-appendix"
          label="Code appendix"
          hint="Attach the analysis code to the paper."
          checked={v.appendix}
          onChange={set("appendix")}
          disabled={readOnly}
        />
        <SwitchRow
          id="review-watermark"
          label="Mark drafts"
          hint="Adds a “Draft” watermark until the paper is approved."
          checked={v.watermark}
          onChange={set("watermark")}
          disabled={readOnly}
        />
      </SettingsGroup>
    </DraftTab>
  );
}

const FILE_TYPES = ["CSV", "Excel", "Parquet", "JSON"] as const;

/** How data comes in, how long it's kept and how it's protected. */
export function SettingsData({ readOnly }: { readOnly: boolean }) {
  const draft = useDraft({
    pinning: "latest",
    sameName: "version",
    types: ["CSV"] as string[],
    pii: true,
    mask: true,
    artifacts: "forever",
    trash: "30",
    region: "auto",
  });
  const { values: v, set } = draft;

  return (
    <DraftTab
      id="data"
      title="Data & storage"
      what="data settings"
      dirty={draft.dirty}
      onDiscard={draft.discard}
      validate={() => (v.types.length ? undefined : "Allow at least one file type.")}
    >
      <SettingsGroup title="Datasets">
        <ChoiceRow
          id="data-pinning"
          label="Runs read"
          value={v.pinning}
          onChange={set("pinning")}
          disabled={readOnly}
          wide
          options={[
            { value: "latest", label: "The latest version" },
            { value: "pinned", label: "The version at the run's start" },
          ]}
        />
        <ChoiceRow
          id="data-same-name"
          label="Uploading a name that exists"
          value={v.sameName}
          onChange={set("sameName")}
          disabled={readOnly}
          wide
          options={[
            { value: "version", label: "Add it as a new version" },
            { value: "copy", label: "Create a separate dataset" },
          ]}
        />
        <SettingsRow label="Allowed file types">
          <div className="flex flex-wrap gap-x-5 gap-y-2 sm:pt-1.5">
            {FILE_TYPES.map((type) => (
              <label key={type} htmlFor={`data-type-${type}`} className="flex items-center gap-2 text-sm">
                <Checkbox
                  id={`data-type-${type}`}
                  checked={v.types.includes(type)}
                  disabled={readOnly}
                  onCheckedChange={(on) =>
                    set("types")(on ? [...v.types, type] : v.types.filter((existing) => existing !== type))
                  }
                />
                {type}
              </label>
            ))}
          </div>
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Privacy">
        <SwitchRow
          id="data-pii"
          label="Detect personal data"
          hint="Flags names, emails, phone numbers and IDs in new uploads."
          checked={v.pii}
          onChange={set("pii")}
          disabled={readOnly}
        />
        <SwitchRow
          id="data-mask"
          label="Mask it in previews"
          checked={v.mask}
          onChange={set("mask")}
          disabled={readOnly || !v.pii}
        />
      </SettingsGroup>
      <SettingsGroup title="Retention">
        <ChoiceRow
          id="data-artifacts"
          label="Keep run files"
          hint="Logs, code and intermediate results."
          value={v.artifacts}
          onChange={set("artifacts")}
          disabled={readOnly}
          options={[
            { value: "90", label: "90 days" },
            { value: "180", label: "180 days" },
            { value: "365", label: "1 year" },
            { value: "forever", label: "Forever" },
          ]}
        />
        <ChoiceRow
          id="data-trash"
          label="Keep deleted items"
          hint="Before they're gone for good."
          value={v.trash}
          onChange={set("trash")}
          disabled={readOnly}
          options={["7", "14", "30"].map((days) => ({ value: days, label: `${days} days` }))}
        />
        <ChoiceRow
          id="data-region"
          label="Storage region"
          value={v.region}
          onChange={set("region")}
          disabled={readOnly}
          options={[
            { value: "auto", label: "Automatic" },
            { value: "us", label: "United States" },
            { value: "eu", label: "European Union" },
            { value: "apac", label: "Asia Pacific" },
          ]}
        />
      </SettingsGroup>
    </DraftTab>
  );
}

const WEBHOOK_EVENTS = [
  "Run started",
  "Run needs a decision",
  "Run finished",
  "Paper approved",
  "Dataset uploaded",
] as const;

function AddWebhook({ disabled }: { disabled: boolean }) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["Run finished"]);
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) return;
        setUrl("");
        setEvents(["Run finished"]);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          Add webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add webhook</DialogTitle>
          <DialogDescription>We send a signed POST request to this address when an event happens.</DialogDescription>
        </DialogHeader>
        <form
          id="add-webhook"
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!/^https:\/\/\S+\.\S+/.test(url.trim())) return void toast.error("Enter an https:// address.");
            if (!events.length) return void toast.error("Pick at least one event.");
            notStoredYet("webhooks");
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="webhook-url" className="font-medium text-sm">
              Endpoint
            </label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/hooks/research"
              autoComplete="off"
            />
          </div>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2 font-medium text-sm">Events</legend>
            {WEBHOOK_EVENTS.map((name) => (
              <label
                key={name}
                htmlFor={`webhook-${name.replace(/\s+/g, "-").toLowerCase()}`}
                className="flex items-center gap-2.5 text-sm"
              >
                <Checkbox
                  id={`webhook-${name.replace(/\s+/g, "-").toLowerCase()}`}
                  checked={events.includes(name)}
                  onCheckedChange={(on) =>
                    setEvents((current) => (on ? [...current, name] : current.filter((item) => item !== name)))
                  }
                />
                {name}
              </label>
            ))}
          </fieldset>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="add-webhook">
            Add webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Services outside the platform that hear from the project or receive its work. */
export function SettingsIntegrations({ readOnly }: { readOnly: boolean }) {
  const connect = (name: string) => () => notStoredYet(`the ${name} connection`);
  const button = (name: string) => (
    <Button type="button" variant="outline" size="sm" disabled={readOnly} onClick={connect(name)}>
      Connect
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <SettingsHeading title="Integrations" />
      <SettingsGroup title="Messaging">
        <ServiceRow
          icon={MessageSquare}
          name="Slack"
          description="Post run updates and review requests to a channel."
          action={button("Slack")}
        />
        <ServiceRow
          icon={MessageSquare}
          name="Microsoft Teams"
          description="Post run updates and review requests to a team."
          action={button("Microsoft Teams")}
        />
      </SettingsGroup>
      <SettingsGroup title="References and code">
        <ServiceRow
          icon={Library}
          name="Zotero"
          description="Send each run's reading list to a Zotero collection."
          action={button("Zotero")}
        />
        <ServiceRow
          icon={Library}
          name="Mendeley"
          description="Send each run's reading list to a Mendeley folder."
          action={button("Mendeley")}
        />
        <ServiceRow
          icon={FolderGit2}
          name="GitHub"
          description="Push papers and analysis code to a repository."
          action={button("GitHub")}
        />
      </SettingsGroup>
      <SettingsGroup title="Webhooks">
        <ServiceRow
          icon={Webhook}
          name="No webhooks yet"
          description="Call your own service when runs start, stop or finish."
          action={<AddWebhook disabled={readOnly} />}
        />
      </SettingsGroup>
    </div>
  );
}
