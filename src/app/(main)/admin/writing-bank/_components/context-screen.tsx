"use client";

import { useMemo, useState } from "react";

import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWritingBankContextQuery, useWritingBankLibraryQuery } from "@/hooks/use-writing-bank-query";

import { useAdminAccess } from "../../_components/use-admin-access";
import { BankProblem, DetailSkeleton, errorCode, StaleNotice } from "./bank-states";
import { CardSheet, type OpenCard } from "./card-sheet";
import { CardsTab } from "./cards-tab";
import { contextCards } from "./context-cards-index";
import { ContextOutline } from "./context-outline";
import { BankReleaseNote, Fits, StyleChoices, VenueRequirements, WhenToUse } from "./context-overview";
import { DesignReporting } from "./design-reporting";
import { DetailHeader, OfferSwitch } from "./detail-header";
import { useWritingBankActions } from "./use-writing-bank-actions";
import { DefaultBadge, EntryStatusBadge, ScopeBadge, ToneBadge } from "./writing-bank-badges";
import { journalHref, verificationLabel } from "./writing-bank-format";

type PageTab = "outline" | "cards" | "design" | "venue" | "style";

export function ContextScreen({ journalId, contextId }: { readonly journalId: string; readonly contextId: string }) {
  const { enabled } = useAdminAccess();
  const query = useWritingBankContextQuery(journalId, contextId, enabled);
  const actions = useWritingBankActions();
  const [tab, setTab] = useState<PageTab>("outline");
  const [card, setCard] = useState<OpenCard | null>(null);
  // The blueprint carries rules without their level; the bank's own rule entries give it.
  const ruleBank = useWritingBankLibraryQuery("rules", enabled);
  const cards = useMemo(() => {
    if (!query.data) return null;
    const levels = new Map(
      (ruleBank.data?.items ?? []).map((rule) => [rule.id, typeof rule.level === "string" ? rule.level : ""]),
    );
    return contextCards(query.data.blueprint, query.data.techniques ?? [], levels, query.data.usage?.cards ?? null);
  }, [query.data, ruleBank.data]);
  if (!enabled || query.isPending) return <DetailSkeleton label="Loading research context" />;
  if (query.isError)
    return (
      <BankProblem
        code={errorCode(query.error)}
        subject="context"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );

  const { journal, context, blueprint, settings, journal_settings: journalSettings, stale, release } = query.data;
  const summary = context.summary;
  const ref = { journalId, id: context.id, name: context.shortName, isDefault: settings.is_default };
  const saving = actions.pendingContext?.contextId === context.id;
  const checked = saving ? (actions.pendingContext?.enabled ?? settings.enabled) : settings.enabled;
  const canBeDefault = journalSettings.enabled && settings.enabled;
  const techniques = query.data.techniques ?? [];
  const cardCount = cards ? Object.values(cards).reduce((sum, rows) => sum + rows.length, 0) : 0;
  // A card opened anywhere on the page carries every place this context uses it.
  const openCard = (collection: string, id: string, title: string) => {
    const row = cards
      ? Object.values(cards)
          .flat()
          .find((item) => item.collection === collection && item.id === id)
      : undefined;
    setCard({ collection, id, title, usedIn: row?.usedIn ?? [] });
  };
  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        crumbs={[
          { label: "Writing Bank", href: "/admin/writing-bank" },
          { label: journal.name, href: journalHref(journal.id) },
          { label: context.shortName },
        ]}
        title={context.shortName}
        meta={
          <span>
            {summary.articleType.name} · {summary.macroStructure.name}
          </span>
        }
        description={
          <div className="flex flex-wrap items-center gap-2">
            <ScopeBadge scope={summary.scope} />
            {settings.is_default && <DefaultBadge />}
            {summary.contributions.map((contribution) => (
              <Badge key={contribution.id} variant="outline" className="font-normal">
                {contribution.name}
              </Badge>
            ))}
            {context.verification !== "primary" && (
              <ToneBadge tone="look">{verificationLabel(context.verification)}</ToneBadge>
            )}
            <EntryStatusBadge status={context.status} />
          </div>
        }
        aside={
          <>
            <OfferSwitch
              id="context-offered"
              label="Can be picked"
              checked={checked}
              disabled={saving}
              note={
                journalSettings.enabled ? null : `Users see it once "${journal.name}" is offered on the journal's page.`
              }
              onChange={(value) => actions.setContextEnabled(ref, value)}
            />
            {settings.is_default && (
              <Button
                variant="outline"
                size="sm"
                disabled={actions.defaultPending}
                onClick={() => actions.clearDefault(ref)}
              >
                Clear default
              </Button>
            )}
            {!settings.is_default && canBeDefault && (
              <Button
                variant="outline"
                size="sm"
                disabled={actions.defaultPending}
                onClick={() => actions.makeDefault(ref)}
              >
                <Star data-icon="inline-start" />
                Set as default
              </Button>
            )}
          </>
        }
      />
      {stale && <StaleNotice release={release} />}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Tabs value={tab} onValueChange={(value) => setTab(value as PageTab)} className="min-w-0 gap-4">
          <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList variant="line">
              <TabsTrigger value="outline">Outline</TabsTrigger>
              <TabsTrigger value="cards">Cards · {cardCount}</TabsTrigger>
              <TabsTrigger value="design">Design and reporting</TabsTrigger>
              <TabsTrigger value="venue">Venue requirements</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="outline">
            <ContextOutline
              journal={journal}
              blueprint={blueprint}
              techniques={techniques}
              designIds={context.designs ?? []}
              onOpenCard={openCard}
            />
          </TabsContent>
          <TabsContent value="cards">
            {cards && <CardsTab cards={cards} contexts={query.data.usage?.contexts ?? null} onOpen={openCard} />}
          </TabsContent>
          <TabsContent value="design">
            <DesignReporting
              blueprint={blueprint}
              designIds={context.designs ?? []}
              contributionIds={summary.contributions.map((contribution) => contribution.id)}
              enabled={enabled}
            />
          </TabsContent>
          <TabsContent value="venue">
            <VenueRequirements journal={journal} blueprint={blueprint} />
          </TabsContent>
          <TabsContent value="style">
            <StyleChoices
              blueprint={blueprint}
              enabled={enabled}
              onOpenCard={openCard}
              onOpenRules={() => setTab("cards")}
            />
          </TabsContent>
        </Tabs>
        <aside className="flex min-w-0 flex-col gap-4 lg:pt-12">
          <WhenToUse context={context} />
          <Fits context={context} />
          {release && <BankReleaseNote release={release} />}
        </aside>
      </div>
      <CardSheet card={card} onClose={() => setCard(null)} onOpen={openCard} />
    </div>
  );
}
