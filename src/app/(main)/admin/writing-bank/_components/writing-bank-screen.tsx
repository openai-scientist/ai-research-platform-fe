"use client";

import { toast } from "sonner";

import {
  useRefreshWritingBankMutation,
  useWritingBankJournalQuery,
  useWritingBankJournalsQuery,
  useWritingBankStatusQuery,
} from "@/hooks/use-writing-bank-query";
import { WRITING_BANK_ERRORS } from "@/lib/api/services/fetch-writing-bank";

import { AdminPageHeader } from "../../_components/admin-primitives";
import { useAdminAccess } from "../../_components/use-admin-access";
import { BankProblem, errorCode } from "./bank-states";
import { BankConnection, BankMetrics } from "./bank-status-line";
import { JournalTable } from "./journal-table";
import { useWritingBankActions } from "./use-writing-bank-actions";

export function WritingBankScreen() {
  const { enabled } = useAdminAccess();
  const status = useWritingBankStatusQuery({ enabled });
  const configured = status.data?.configured ?? false;
  const journals = useWritingBankJournalsQuery(enabled && configured);
  const defaults = status.data?.default ?? null;
  // The status names the default by id only; the journal's page (cached for its own screen) gives the names.
  const defaultJournal = useWritingBankJournalQuery(defaults?.journal_id, enabled && configured);
  const refresh = useRefreshWritingBankMutation();
  const actions = useWritingBankActions();

  const items = journals.data?.items ?? [];
  const journalName =
    items.find((item) => item.id === defaults?.journal_id)?.name ?? defaultJournal.data?.journal.name ?? null;
  const contextName =
    defaultJournal.data?.contexts.find((context) => context.id === defaults?.context_id)?.shortName ?? null;

  const onRefresh = () =>
    refresh.mutate(undefined, {
      onSuccess: ({ data }) => {
        if (data.reachable && data.release) toast.success(`Writing Bank release ${data.release.release} loaded.`);
        else toast.warning("The bank did not answer. The last cached release is still shown.");
      },
    });

  const notConfigured = status.data && !status.data.configured;

  const body = () => {
    if (notConfigured) return <BankProblem code={WRITING_BANK_ERRORS.notConfigured} />;
    if (journals.isError)
      return (
        <BankProblem
          code={errorCode(journals.error)}
          subject="list"
          onRetry={() => void journals.refetch()}
          retrying={journals.isFetching}
        />
      );
    return (
      <JournalTable
        items={items}
        pending={!enabled || status.isPending || journals.isPending}
        busy={journals.isFetching && !journals.isPending}
        pendingJournal={actions.pendingJournal}
        onToggle={(journal, value) =>
          actions.setJournalEnabled(
            { id: journal.id, name: journal.name, isDefault: journal.settings.is_default },
            value,
          )
        }
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Writing Bank"
        description="Choose which journals and research contexts users can pick when they write a paper. The content comes from the bank and is read-only here."
        actions={
          <BankConnection
            status={status.data}
            pending={!enabled || status.isPending}
            refreshing={refresh.isPending}
            onRefresh={onRefresh}
          />
        }
      />
      <BankMetrics
        status={status.data}
        pending={!enabled || status.isPending}
        defaultNames={{ journal: journalName, context: contextName }}
      />
      {body()}
    </div>
  );
}
