import { useId } from "react";

import {
  Bell,
  Database,
  FlaskConical,
  Globe2,
  LockKeyhole,
  type LucideIcon,
  Save,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { AdminPageHeader } from "./admin-primitives";

export function AdminSettings() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="System"
        title="Settings"
        description="Manage platform-wide defaults, authentication, AI configuration, sandbox limits, notifications, and retention."
        actions={
          <Button size="sm">
            <Save data-icon="inline-start" />
            Save changes
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsCard icon={Globe2} title="General" description="Identity and regional defaults for the platform.">
          <SettingsGrid>
            <SettingsField label="Platform name" value="OpenAI Scientist" />
            <SettingsField label="Default language" value="English (US)" />
            <SettingsField label="Timezone" value="Asia/Ho_Chi_Minh" />
            <ToggleField label="Maintenance mode" description="Temporarily prevent new runs from starting." />
          </SettingsGrid>
        </SettingsCard>

        <SettingsCard
          icon={LockKeyhole}
          title="Authentication"
          description="Login, session, and account security policies."
        >
          <SettingsGrid>
            <SettingsField label="Session timeout" value="30 days" />
            <SettingsField label="Sign-in code lifetime" value="10 minutes" />
            <ToggleField
              label="Account lock policy"
              description="A code stops working after five wrong tries; ten failed sign-ins lock the account for an hour."
              enabled
            />
            <ToggleField label="Require MFA for admins" description="Enforce MFA for SYSTEM_ADMIN accounts." enabled />
          </SettingsGrid>
        </SettingsCard>

        <SettingsCard
          icon={ServerCog}
          title="AI configuration"
          description="Default provider and request-level guardrails."
        >
          <SettingsGrid>
            <SettingsField label="Default LLM provider" value="OpenAI" />
            <SettingsField label="Default model" value="GPT-5" />
            <SettingsField label="Maximum token limit" value="400,000" />
            <SettingsField label="Request timeout" value="30 seconds" />
          </SettingsGrid>
        </SettingsCard>

        <SettingsCard
          icon={ShieldCheck}
          title="Decision gate configuration"
          description="Defaults for structured decision and human escalation behavior."
        >
          <SettingsGrid>
            <SettingsField label="Primary decision provider" value="TypeSafe / Jev" />
            <SettingsField label="Fallback provider" value="Structured LLM Provider" />
            <SettingsField label="Confidence threshold" value="0.80" />
            <SettingsField label="Human escalation threshold" value="0.55" />
          </SettingsGrid>
        </SettingsCard>

        <SettingsCard
          icon={FlaskConical}
          title="Sandbox configuration"
          description="Runtime limits for secure research execution."
        >
          <SettingsGrid>
            <SettingsField label="Maximum execution time" value="15 minutes" />
            <SettingsField label="CPU limit" value="4 vCPU" />
            <SettingsField label="Memory limit" value="16 GB" />
            <SettingsField label="Output limit" value="250 MB" />
          </SettingsGrid>
        </SettingsCard>

        <SettingsCard
          icon={Database}
          title="Usage limits & storage"
          description="Default quotas applied to new users and projects."
        >
          <SettingsGrid>
            <SettingsField label="Default user token limit" value="5M / month" />
            <SettingsField label="Default monthly cost limit" value="$250" />
            <SettingsField label="Maximum dataset size" value="10 GB" />
            <SettingsField label="Maximum project storage" value="100 GB" />
          </SettingsGrid>
        </SettingsCard>

        <SettingsCard icon={Bell} title="Notifications" description="Configure operational and usage alerts.">
          <div className="space-y-4">
            <ToggleField label="System error alerts" description="Notify admins when critical services fail." enabled />
            <ToggleField
              label="Usage threshold alerts"
              description="Notify when a user or project crosses its quota."
              enabled
            />
            <ToggleField
              label="Provider failure alerts"
              description="Notify when a provider becomes unavailable."
              enabled
            />
            <ToggleField label="Experiment failure alerts" description="Notify project managers about failed runs." />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Database}
          title="Data retention"
          description="Retention periods for logs, artifacts, and audit data."
        >
          <SettingsGrid>
            <SettingsField label="Log retention period" value="90 days" />
            <SettingsField label="Experiment artifacts" value="180 days" />
            <SettingsField label="Audit logs" value="365 days" />
            <SettingsField label="Allowed file types" value="CSV, JSON, PDF, TXT" />
          </SettingsGrid>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  children,
  description,
  icon: Icon,
  title,
}: {
  readonly children: React.ReactNode;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SettingsGrid({ children }: { readonly children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function SettingsField({ label, value }: { readonly label: string; readonly value: string }) {
  const inputId = useId();

  return (
    <label htmlFor={inputId} className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Input id={inputId} value={value} readOnly />
    </label>
  );
}

function ToggleField({
  description,
  enabled = false,
  label,
}: {
  readonly description: string;
  readonly enabled?: boolean;
  readonly label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="mt-1 text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch defaultChecked={enabled} aria-label={label} />
    </div>
  );
}
