"use client";

import { toast } from "sonner";

import {
  useSetWritingBankDefaultMutation,
  useUpdateContextSettingsMutation,
  useUpdateJournalSettingsMutation,
} from "@/hooks/use-writing-bank-query";

interface JournalRef {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ContextRef {
  journalId: string;
  id: string;
  name: string;
  isDefault: boolean;
}

const CLEARED = "It was the default, so no default is set now.";

/** The Writing Bank's writes, each with the success toast that names what changed. Errors toast the BE message. */
export function useWritingBankActions() {
  const journal = useUpdateJournalSettingsMutation();
  const context = useUpdateContextSettingsMutation();
  const defaults = useSetWritingBankDefaultMutation();

  const setJournalEnabled = (target: JournalRef, enabled: boolean) =>
    journal.mutate(
      { journalId: target.id, enabled },
      {
        onSuccess: () => {
          const message = `Journal "${target.name}" ${enabled ? "enabled" : "disabled"}.`;
          toast.success(message, !enabled && target.isDefault ? { description: CLEARED } : undefined);
        },
      },
    );

  const setContextEnabled = (target: ContextRef, enabled: boolean) =>
    context.mutate(
      { journalId: target.journalId, contextId: target.id, enabled },
      {
        onSuccess: () => {
          const message = `Research context "${target.name}" ${enabled ? "enabled" : "disabled"}.`;
          toast.success(message, !enabled && target.isDefault ? { description: CLEARED } : undefined);
        },
      },
    );

  const makeDefault = (target: ContextRef) =>
    defaults.mutate(
      { journal_id: target.journalId, context_id: target.id },
      { onSuccess: () => toast.success(`"${target.name}" is now the default research context.`) },
    );

  const clearDefault = (target: ContextRef) =>
    defaults.mutate(null, {
      onSuccess: () => toast.success(`"${target.name}" is no longer the default research context.`),
    });

  return {
    setJournalEnabled,
    setContextEnabled,
    makeDefault,
    clearDefault,
    /** The journal or context whose switch is being saved, so its row can show the value being sent. */
    pendingJournal: journal.isPending ? journal.variables : undefined,
    pendingContext: context.isPending ? context.variables : undefined,
    defaultPending: defaults.isPending,
  };
}
