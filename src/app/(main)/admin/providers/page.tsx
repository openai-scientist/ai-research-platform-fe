import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { AdminPageHeader } from "../_components/admin-primitives";
import { ProviderSettingsTabs } from "./_components/provider-settings-tabs";

export const metadata: Metadata = {
  title: "Models & Providers · OpenAI Scientist",
  description: "Monitor providers and manage research models, integration keys, and token limits.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  if (tab === "usage") redirect("/admin/usage");
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        eyebrow="AI Platform"
        title="Models & Providers"
        description="Monitor providers and manage research models, integration keys, and token limits."
      />
      <ProviderSettingsTabs />
    </div>
  );
}
