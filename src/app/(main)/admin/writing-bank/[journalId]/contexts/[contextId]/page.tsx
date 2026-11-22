import type { Metadata } from "next";

import { ContextScreen } from "../../../_components/context-screen";
import { routeId } from "../../../_components/writing-bank-format";

export const metadata: Metadata = {
  title: "Research context · Writing Bank · OpenAI Scientist",
  description: "The sections, moves, steps and paragraph plan of a Writing Bank research context.",
};

export default async function Page({ params }: { params: Promise<{ journalId: string; contextId: string }> }) {
  const { journalId, contextId } = await params;
  return <ContextScreen journalId={routeId(journalId)} contextId={routeId(contextId)} />;
}
