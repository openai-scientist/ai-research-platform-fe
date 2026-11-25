"use client";

import Link from "next/link";

import { Input } from "@/components/ui/input";
import { CONSULTATION_KINDS } from "@/lib/api/services/fetch-admin";

import { NumberRow } from "../../../projects/[projectId]/_components/settings-kit";
import { SettingsGroup, SettingsHeading, SettingsRow } from "../../../projects/[projectId]/_components/settings-panel";
import { type FormValues, fieldId, KIND_LABELS, type SettingsTab } from "./platform-settings-model";
import { DomainsInput, type PaneProps, SpecRow } from "./settings-fields";

interface Pane extends PaneProps {
  onDomains(domains: string[]): void;
  onSteps(kind: (typeof CONSULTATION_KINDS)[number], value: string): void;
  onEmail(value: string): void;
}

function Rows({ fields, ...props }: PaneProps & { fields: Parameters<typeof SpecRow>[0]["field"][] }) {
  return (
    <>
      {fields.map((field) => (
        <SpecRow key={field} field={field} {...props} />
      ))}
    </>
  );
}

export const TAB_TITLES: Record<SettingsTab, string> = {
  runs: "Runs",
  access: "Sign-up and sharing",
  retention: "Retention and capacity",
  oversight: "Oversight (PI)",
};

/** The rows of one tab. All tabs edit the same draft, so nothing is lost when the person switches. */
export function SettingsPane({ tab, ...props }: Pane & { tab: SettingsTab }) {
  const heading = <SettingsHeading title={TAB_TITLES[tab]} />;
  if (tab === "runs") {
    return (
      <>
        {heading}
        <SettingsGroup title="Active runs">
          <Rows {...props} fields={["max_active_runs_per_user", "max_active_runs_total"]} />
        </SettingsGroup>
        <SettingsGroup title="Revisions and rounds">
          <Rows {...props} fields={["max_auto_revisions", "max_iterations", "max_rounds"]} />
        </SettingsGroup>
      </>
    );
  }
  if (tab === "access") {
    return (
      <>
        {heading}
        <SettingsGroup title="Sign-up">
          <SettingsRow
            label="Allowed sign-up domains"
            htmlFor="platform-allowed-domains"
            hint="Only addresses on these domains can sign up. Leave the list empty to allow any domain. A person who already has an account can still sign in, whatever the list says."
          >
            <DomainsInput id="platform-allowed-domains" value={props.form.domains} onChange={props.onDomains} />
          </SettingsRow>
        </SettingsGroup>
        <SettingsGroup title="Sharing">
          <Rows {...props} fields={["release_share_max_days"]} />
        </SettingsGroup>
      </>
    );
  }
  if (tab === "retention") {
    return (
      <>
        {heading}
        <SettingsGroup title="Retention">
          <Rows {...props} fields={["engine_run_retention_days"]} />
        </SettingsGroup>
        <SettingsGroup title="Capacity">
          <Rows
            {...props}
            fields={[
              "max_active_runs_per_engine",
              "stage_finish_grace_seconds",
              "sweep_engine_concurrency",
              "sweep_pass_seconds",
            ]}
          />
        </SettingsGroup>
      </>
    );
  }
  return <OversightPane {...props} heading={heading} />;
}

function OversightPane({ heading, ...props }: Pane & { heading: React.ReactNode }) {
  const { form, problems, report, onSteps, onEmail } = props;
  const emailId = fieldId("oversight_contact_email");
  return (
    <>
      {heading}
      <SettingsGroup title="Consultations">
        <Rows
          {...props}
          fields={["oversight_llm_timeout_seconds", "oversight_evalue_alpha", "oversight_pi_proposal_steps"]}
        />
        <SettingsRow
          label="Contact email"
          htmlFor={emailId}
          hint="Sent to OpenAlex as the mailto of the PI's literature search. Optional."
        >
          <Input
            id={emailId}
            type="email"
            value={form.contactEmail}
            placeholder="research@example.com"
            autoComplete="off"
            aria-invalid={"oversight_contact_email" in problems || undefined}
            className="max-w-md"
            onChange={(event) => onEmail(event.target.value)}
            onBlur={() => report("oversight_contact_email")}
          />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title="Model calls per consultation">
        {CONSULTATION_KINDS.map((kind) => {
          const key = `pi_steps.${kind}`;
          return (
            <NumberRow
              key={kind}
              id={fieldId(key)}
              label={KIND_LABELS[kind].label}
              hint={KIND_LABELS[kind].hint}
              unit="calls"
              value={form.piSteps[kind]}
              invalid={key in problems}
              onChange={(value) => onSteps(kind, value)}
              onBlur={() => report(key)}
            />
          );
        })}
      </SettingsGroup>
      <SettingsGroup title="Project briefs">
        <Rows {...props} fields={["project_brief_chars", "project_lesson_min_runs"]} />
      </SettingsGroup>
    </>
  );
}

/** The one pointer to where models and keys live; they are not platform settings. */
export function ModelsNote() {
  return (
    <p className="text-muted-foreground text-sm">
      Models, keys and token limits are managed in{" "}
      <Link href="/admin/providers" className="font-medium text-foreground underline underline-offset-4">
        Models &amp; Providers
      </Link>
      .
    </p>
  );
}

export type { FormValues };
