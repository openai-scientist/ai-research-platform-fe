import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TokenLimitsSettings } from "../../_components/platform-settings/token-limits";
import { IntegrationSettings, RunModelsSettings } from "../../_components/run-models";
import { ConnectedProviders, ModelCatalog, ProviderOverview } from "./provider-overview";

export function ProviderSettingsTabs() {
  return (
    <Tabs defaultValue="overview" className="min-w-0 gap-4">
      <TabsList
        aria-label="Models and providers settings"
        className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto *:h-7 *:flex-none"
      >
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="providers-models">Providers &amp; Models</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="tokens">Token limits</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="min-w-0">
        <ProviderOverview />
      </TabsContent>
      {/* Keep drafts mounted when switching tabs. */}
      <TabsContent
        value="providers-models"
        forceMount
        className="flex min-w-0 flex-col gap-4 data-[state=inactive]:hidden"
      >
        <ConnectedProviders />
        <RunModelsSettings />
        <ModelCatalog />
      </TabsContent>
      <TabsContent value="integrations" forceMount className="min-w-0 data-[state=inactive]:hidden">
        <IntegrationSettings />
      </TabsContent>
      <TabsContent value="tokens" forceMount className="flex min-w-0 flex-col gap-4 data-[state=inactive]:hidden">
        <TokenLimitsSettings />
      </TabsContent>
    </Tabs>
  );
}
