"use client";

import { type FormEvent, useEffect, useMemo, useRef } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { SaveBar } from "../../projects/[projectId]/_components/settings-panel";
import { AdminPageHeader } from "./admin-primitives";
import { dirtyTabs, fieldId, type SettingsTab, tabOfField } from "./platform-settings/platform-settings-model";
import { SettingsNav, TABS } from "./platform-settings/settings-nav";
import { ModelsNote, SettingsPane } from "./platform-settings/settings-panes";
import { usePlatformSettings } from "./platform-settings/use-platform-settings";

export function AdminSettings() {
  const settings = usePlatformSettings("settings");
  const { form, saved, query } = settings;
  const router = useRouter();
  const requested = useSearchParams().get("tab");
  const tab: SettingsTab = TABS.find((id) => id === requested) ?? TABS[0];
  const focusField = useRef<string | null>(null);
  const changed = useMemo(() => (form && saved ? dirtyTabs(form, saved) : new Set<SettingsTab>()), [form, saved]);

  // After Save refused a field on another tab, focus it once that tab is on screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the tab changes
  useEffect(() => {
    const id = focusField.current;
    const element = id ? document.getElementById(id) : null;
    if (!element) return;
    focusField.current = null;
    element.focus();
    element.scrollIntoView({ block: "center" });
  }, [tab, form]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!settings.dirty) return;
    const [first] = Object.keys(settings.problems);
    if (first) {
      toast.error(settings.problems[first], { id: `platform-settings:${first}` });
      focusField.current = fieldId(first);
      const target = tabOfField(first);
      if (target !== tab) router.replace(`?tab=${target}`, { scroll: false });
      else {
        document.getElementById(focusField.current)?.focus();
        focusField.current = null;
      }
      return;
    }
    settings.save();
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="System"
        title="Settings"
        description="Platform-wide limits and behaviour. A save publishes a new settings version for every run that starts after it."
        actions={settings.dirty && <Badge variant="outline">Unsaved changes</Badge>}
      />
      <ModelsNote />

      {!form ? (
        <LoadState failed={query.isError} fetching={query.isFetching} retry={() => void query.refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
          <SettingsNav tab={tab} changed={changed} />
          <form
            id="platform-settings"
            noValidate
            aria-label="Platform settings"
            onSubmit={submit}
            key={tab}
            className="@container/settings fade-in-0 flex min-w-0 max-w-5xl animate-in flex-col gap-6 duration-200 motion-reduce:animate-none"
          >
            <SettingsPane
              tab={tab}
              form={form}
              problems={settings.problems}
              setNumber={settings.setNumber}
              report={settings.report}
              onDomains={(domains) => settings.edit((current) => ({ ...current, domains }))}
              onSteps={(kind, value) =>
                settings.edit((current) => ({ ...current, piSteps: { ...current.piSteps, [kind]: value } }))
              }
              onEmail={(value) => settings.edit((current) => ({ ...current, contactEmail: value }))}
            />
            <SaveBar
              dirty={settings.dirty}
              pending={settings.pending}
              form="platform-settings"
              onDiscard={settings.discard}
            />
          </form>
        </div>
      )}
    </div>
  );
}

function LoadState({ failed, fetching, retry }: { failed: boolean; fetching: boolean; retry(): void }) {
  if (failed) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
        <p className="text-muted-foreground text-sm">The platform settings could not be loaded.</p>
        <Button variant="outline" size="sm" disabled={fetching} onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }
  return (
    <div role="status" aria-label="Loading platform settings" className="grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)]">
      <Skeleton className="hidden h-40 lg:block" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
