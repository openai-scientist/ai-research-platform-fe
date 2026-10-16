import type { Metadata } from "next";

import { AdminProviders } from "../_components/platform-pages";

export const metadata: Metadata = {
  title: "Models & Providers · OpenAI Scientist",
  description: "Configure models, providers, capabilities, and AI platform limits.",
};

export default function Page() {
  return <AdminProviders />;
}
