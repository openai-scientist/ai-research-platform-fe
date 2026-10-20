"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ReviewMode } from "@/lib/run-stream/contract";

import { MODES } from "./run-studio/run-meta";
import { useProjectSettings } from "./settings-api";
import { ChoiceRow, DraftTab, NumberRow, SwitchRow, TextRow, useDraft } from "./settings-kit";
import { SettingsGroup, SettingsRow, TagInput } from "./settings-panel";

// The server's run budget: $5 unless a run asks for more, never above $20.
const MAX_BUDGET = 20;

/** A select whose options carry a short line under their name; the trigger shows the name only. */
function DescribedSelect({
  id,
  value,
  onChange,
  options,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; line: string }[];
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);
  return (
    <>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full max-w-80">
          <SelectValue>{selected?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-w-80">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="items-start py-2">
                <span className="flex flex-col gap-0.5">
                  <span>{option.label}</span>
                  <span className="whitespace-normal text-muted-foreground text-xs">{option.line}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {selected && <p className="text-pretty text-muted-foreground text-xs">{selected.line}</p>}
    </>
  );
}

const MODE_OPTIONS = (Object.keys(MODES) as ReviewMode[]).map((key) => ({
  value: key,
  label: MODES[key].label,
  line: MODES[key].line,
}));

const STARTER_OPTIONS = [
  { value: "researchers", label: "Managers and researchers", line: "Anyone who can upload data can start a run." },
  { value: "managers", label: "Managers only", line: "Researchers prepare data; a manager starts each run." },
];

/** What a new research run starts with, how far it may go, and who may start one. */
export function SettingsRuns({ readOnly }: { readOnly: boolean }) {
  const draft = useDraft("runs", {
    mode: "copilot",
    budget: "5",
    fields: [] as string[],
    starters: "researchers",
    concurrent: "2",
    rounds: "3",
    stageLimit: "60",
    retry: true,
    pauseOnFailure: true,
  });
  const { values: v, set } = draft;

  return (
    <DraftTab
      id="runs"
      title="Research runs"
      what="run settings"
      dirty={draft.dirty}
      onDiscard={draft.discard}
      onSave={draft.save}
      validate={() => {
        const amount = Number(v.budget);
        if (!(amount > 0)) return "Enter a budget above $0 for each run.";
        if (amount > MAX_BUDGET) return `A run's budget can be up to $${MAX_BUDGET}.`;
      }}
    >
      <SettingsGroup title="Defaults for new runs">
        <SettingsRow label="Review mode" htmlFor="runs-mode" hint="How often a run stops for your decision.">
          <DescribedSelect
            id="runs-mode"
            value={v.mode}
            onChange={set("mode")}
            options={MODE_OPTIONS}
            disabled={readOnly}
          />
        </SettingsRow>
        <NumberRow
          id="runs-budget"
          label="Budget per run"
          hint={`A run stops once it spends this much. Up to $${MAX_BUDGET}.`}
          prefix="$"
          value={v.budget}
          onChange={set("budget")}
          disabled={readOnly}
        />
        <ChoiceRow
          id="runs-rounds"
          label="Research rounds"
          hint="Each round tests hypotheses and refines them."
          value={v.rounds}
          onChange={set("rounds")}
          disabled={readOnly}
          options={["1", "2", "3", "5"].map((count) => ({
            value: count,
            label: `Up to ${count} ${count === "1" ? "round" : "rounds"}`,
          }))}
        />
        <SettingsRow label="Research fields" htmlFor="runs-fields" hint="Suggested when a run starts.">
          <TagInput id="runs-fields" value={v.fields} onChange={set("fields")} disabled={readOnly} />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Limits">
        <ChoiceRow
          id="runs-concurrent"
          label="Runs at the same time"
          hint="Extra runs wait in a queue."
          value={v.concurrent}
          onChange={set("concurrent")}
          disabled={readOnly}
          options={["1", "2", "3", "5"].map((count) => ({ value: count, label: `${count} at once` }))}
        />
        <ChoiceRow
          id="runs-stage-limit"
          label="Time limit per stage"
          value={v.stageLimit}
          onChange={set("stageLimit")}
          disabled={readOnly}
          options={[
            { value: "30", label: "30 minutes" },
            { value: "60", label: "1 hour" },
            { value: "120", label: "2 hours" },
            { value: "none", label: "No limit" },
          ]}
        />
      </SettingsGroup>
      <SettingsGroup title="When something fails">
        <SwitchRow
          id="runs-retry"
          label="Retry a failed stage once"
          hint="Covers brief outages of a model or a data source."
          checked={v.retry}
          onChange={set("retry")}
          disabled={readOnly}
        />
        <SwitchRow
          id="runs-pause"
          label="Pause instead of stopping"
          hint="Keep the run so it can be resumed after you've looked."
          checked={v.pauseOnFailure}
          onChange={set("pauseOnFailure")}
          disabled={readOnly}
        />
      </SettingsGroup>
      <SettingsGroup title="Access">
        <SettingsRow label="Who can start runs" htmlFor="runs-starters">
          <DescribedSelect
            id="runs-starters"
            value={v.starters}
            onChange={set("starters")}
            options={STARTER_OPTIONS}
            disabled={readOnly}
          />
        </SettingsRow>
      </SettingsGroup>
    </DraftTab>
  );
}

/** A monthly ceiling on what the project's runs may spend, with an early warning. */
export function SettingsSpending({ readOnly }: { readOnly: boolean }) {
  const { snapshot } = useProjectSettings();
  const unsupported = (field: string) => readOnly || !snapshot.capabilities[`spending.${field}`]?.supported;
  const draft = useDraft("spending", {
    capped: false,
    limit: "100",
    warnAt: "80",
    atLimit: "stop",
    billingEmail: "",
  });
  const { values: v, set } = draft;

  return (
    <DraftTab
      id="spending"
      title="Spending"
      what="the spending limit"
      dirty={draft.dirty}
      onDiscard={draft.discard}
      onSave={draft.save}
      validate={() => {
        if (v.capped && !(Number(v.limit) > 0)) return "Enter a monthly limit above $0.";
        if (v.billingEmail && !/^\S+@\S+\.\S+$/.test(v.billingEmail)) return "Enter a valid billing email.";
      }}
    >
      <SettingsGroup title="Monthly limit">
        <SwitchRow
          id="spending-cap"
          label="Limit monthly spending"
          hint="A soft limit on recorded model costs. Resets on the 1st in the project's timezone; work already dispatched may still incur costs."
          checked={v.capped}
          onChange={set("capped")}
          disabled={unsupported("capped")}
        />
        {v.capped && (
          <>
            <NumberRow
              id="spending-limit"
              label="Limit"
              prefix="$"
              unit="per month"
              value={v.limit}
              onChange={set("limit")}
              disabled={unsupported("limit")}
            />
            <ChoiceRow
              id="spending-warn"
              label="Warn at"
              value={v.warnAt}
              onChange={set("warnAt")}
              disabled={unsupported("warn_at")}
              options={["50", "75", "80", "90"].map((percent) => ({
                value: percent,
                label: `${percent}% of the limit`,
              }))}
            />
            <ChoiceRow
              id="spending-at-limit"
              label="At the limit"
              value={v.atLimit}
              onChange={set("atLimit")}
              disabled={unsupported("at_limit")}
              hint={
                v.atLimit === "pause"
                  ? "The saved pause policy currently acts as stop. Select a supported option to replace it."
                  : "Stop blocks supported start and continuation actions at the limit; it does not cancel engine work already dispatched."
              }
              wide
              options={[
                { value: "stop", label: "Stop new work at the limit" },
                ...(v.atLimit === "pause"
                  ? [{ value: "pause", label: "Legacy pause (acts as stop)", disabled: true }]
                  : []),
                { value: "notify", label: "Only notify managers" },
              ]}
            />
          </>
        )}
      </SettingsGroup>
      <SettingsGroup title="Billing">
        <TextRow
          id="spending-email"
          label="Billing contact"
          hint="Billing email delivery is not available yet. Budget alerts are sent in-app to active Project Managers."
          type="email"
          value={v.billingEmail}
          onChange={set("billingEmail")}
          placeholder="finance@example.com"
          disabled={unsupported("billing_email")}
        />
      </SettingsGroup>
    </DraftTab>
  );
}

const EVENTS = [
  { key: "decision", title: "A run needs a decision" },
  { key: "finished", title: "A run finishes or fails" },
  { key: "comments", title: "New comments on a run" },
  { key: "mentions", title: "Someone mentions you" },
  { key: "approved", title: "A paper is approved" },
  { key: "imports", title: "A data import finishes" },
  { key: "spending", title: "Spending reaches the warning" },
  { key: "members", title: "Member changes" },
] as const;

type EventKey = (typeof EVENTS)[number]["key"];

const CHANNELS: Record<EventKey, { app: boolean; email: boolean }> = {
  decision: { app: true, email: true },
  finished: { app: true, email: false },
  comments: { app: true, email: false },
  mentions: { app: true, email: true },
  approved: { app: true, email: false },
  imports: { app: true, email: false },
  spending: { app: true, email: true },
  members: { app: true, email: false },
};

/** Which project events reach you, and where. Every member picks their own. */
export function SettingsNotifications() {
  const draft = useDraft("notifications", { channels: CHANNELS, digest: "off", quiet: false });
  const { values: v, set } = draft;
  const toggle = (key: EventKey, channel: "app" | "email", on: boolean) =>
    set("channels")({ ...v.channels, [key]: { ...v.channels[key], [channel]: on } });

  return (
    <DraftTab
      id="notifications"
      title="Notifications"
      what="notification choices"
      dirty={draft.dirty}
      onDiscard={draft.discard}
      onSave={draft.save}
    >
      <SettingsGroup title="Only for you">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs">
              <th scope="col" className="py-2.5 pl-4 text-left font-normal sm:pl-5">
                Event
              </th>
              <th scope="col" className="w-16 py-2.5 text-center font-normal sm:w-20">
                In app
              </th>
              <th scope="col" className="w-16 py-2.5 pr-3 text-center font-normal sm:w-20">
                Email
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {EVENTS.map((event) => (
              <tr key={event.key}>
                <th scope="row" className="py-3.5 pl-5 text-left font-medium">
                  {event.title}
                </th>
                {(["app", "email"] as const).map((channel) => (
                  <td key={channel} className={channel === "email" ? "pr-3 text-center" : "text-center"}>
                    <Switch
                      checked={v.channels[event.key][channel]}
                      onCheckedChange={(on) => toggle(event.key, channel, on)}
                      aria-label={`${event.title}: ${channel === "app" ? "in app" : "email"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsGroup>
      <SettingsGroup title="Delivery">
        <ChoiceRow
          id="notifications-digest"
          label="Email digest"
          hint="Bundle the emails above into one."
          value={v.digest}
          onChange={set("digest")}
          options={[
            { value: "off", label: "Send right away" },
            { value: "daily", label: "Once a day" },
            { value: "weekly", label: "Once a week" },
          ]}
        />
        <SwitchRow
          id="notifications-quiet"
          label="Quiet hours"
          hint="No emails between 10 PM and 8 AM in the project's time zone."
          checked={v.quiet}
          onChange={set("quiet")}
        />
      </SettingsGroup>
    </DraftTab>
  );
}
