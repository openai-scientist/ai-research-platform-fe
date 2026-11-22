"use client";

import { useWritingBankJournalQuery } from "@/hooks/use-writing-bank-query";

import { useAdminAccess } from "../../_components/use-admin-access";
import { BankProblem, DetailSkeleton, errorCode, StaleNotice } from "./bank-states";
import { ContextCards } from "./context-cards";
import { DetailHeader, MetaDot, OfferSwitch } from "./detail-header";
import { useWritingBankActions } from "./use-writing-bank-actions";
import { VenueProfile } from "./venue-profile";
import { KindBadge } from "./writing-bank-badges";
import { humanize, plural, publisherName } from "./writing-bank-format";

export function JournalScreen({ journalId }: { readonly journalId: string }) {
  const { enabled } = useAdminAccess();
  const query = useWritingBankJournalQuery(journalId, enabled);
  const actions = useWritingBankActions();

  if (!enabled || query.isPending) return <DetailSkeleton label="Loading journal" />;
  if (query.isError)
    return (
      <BankProblem code={errorCode(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
    );

  const { journal, contexts, settings, stale, release } = query.data;
  const publisher = publisherName(journal.publisher);
  const saving = actions.pendingJournal?.journalId === journal.id;
  const offered = saving ? (actions.pendingJournal?.enabled ?? settings.enabled) : settings.enabled;
  const onContexts = contexts.filter((context) => context.settings.enabled).length;

  return (
    <div className="flex flex-col gap-4">
      <DetailHeader
        crumbs={[{ label: "Writing Bank", href: "/admin/writing-bank" }, { label: journal.name }]}
        title={journal.name}
        meta={
          <>
            <KindBadge kind={journal.kind} />
            {publisher && <span>{publisher}</span>}
            <MetaDot />
            <span>{humanize(journal.discipline)}</span>
          </>
        }
        aside={
          <OfferSwitch
            id="journal-offered"
            label="Offered to users"
            checked={offered}
            disabled={saving}
            note={
              offered
                ? `${plural(onContexts, "research context")} of ${contexts.length} can be picked.`
                : "Users cannot pick this journal until it is offered."
            }
            onChange={(value) =>
              actions.setJournalEnabled({ id: journal.id, name: journal.name, isDefault: settings.is_default }, value)
            }
          />
        }
      />
      {stale && <StaleNotice release={release} />}
      <ContextCards journalId={journal.id} journalOffered={settings.enabled} contexts={contexts} actions={actions} />
      <VenueProfile journal={journal} />
    </div>
  );
}
