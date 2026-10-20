import type { Metadata } from "next";

import { AdminDecisionProviders } from "../_components/platform-pages";

export const metadata: Metadata = {
  title: "Decision Providers · OpenAI Scientist",
  description: "Configure structured decision providers and evidence gates.",
};

export default function Page() {
  return <AdminDecisionProviders />;
}
