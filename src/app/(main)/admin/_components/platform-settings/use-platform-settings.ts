"use client";

import { useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { adminKeys } from "@/lib/api/query-keys";
import { fetchAdmin } from "@/lib/api/services/fetch-admin";

import { useUnsavedWarning } from "../../../projects/[projectId]/_components/settings-panel";
import {
  type FormValues,
  isDirty,
  mergeForSave,
  type NumberKey,
  type SettingsScope,
  toForm,
  validate,
} from "./platform-settings-model";

/**
 * The platform settings for one screen. Settings edits the run behaviour and Models & Providers edits the token
 * limits, but the API takes the whole object, so a save reads the settings again and changes only this screen's
 * fields. Both screens share one query, so a save on either refreshes the other.
 */
export function usePlatformSettings(scope: SettingsScope) {
  const client = useQueryClient();
  const query = useApiQuery(adminKeys.settings(), (signal) => fetchAdmin.getSettings(signal));
  const save = useApiMutation(
    async (form: FormValues) => {
      const latest = await fetchAdmin.getSettings();
      return fetchAdmin.saveSettings(mergeForSave(latest.data, form, scope));
    },
    [adminKeys.settings()],
  );
  const saved = useMemo(() => (query.data ? toForm(query.data.data) : null), [query.data]);
  const [draft, setDraft] = useState<FormValues | null>(null);

  const form = draft ?? saved;
  const supportsCreditRate = typeof query.data?.data.credits_per_million_tokens === "number";
  const dirty = Boolean(saved && draft && isDirty(draft, saved, scope));
  const problems = useMemo(
    () => (form ? validate(form, scope, supportsCreditRate) : {}),
    [form, scope, supportsCreditRate],
  );
  const valid = Object.keys(problems).length === 0;
  useUnsavedWarning(dirty);

  const edit = (change: (current: FormValues) => FormValues) => {
    if (form) setDraft(change(form));
  };
  const setNumber = (key: NumberKey, value: string) =>
    edit((current) => ({ ...current, numbers: { ...current.numbers, [key]: value } }));

  return {
    query,
    form,
    saved,
    supportsCreditRate,
    dirty,
    problems,
    valid,
    pending: save.isPending,
    edit,
    setNumber,
    discard: () => setDraft(null),
    /** Says why a field is invalid, once, when the person leaves it. */
    report: (key: string) => {
      const message = problems[key];
      if (message) toast.error(message, { id: `platform-settings:${key}` });
    },
    save: () => {
      if (!form || !dirty || !valid) return;
      save.mutate(form, {
        onSuccess: (response) => {
          client.setQueryData(adminKeys.settings(), response);
          setDraft(null);
          toast.success("Platform settings saved.");
        },
      });
    },
  };
}
