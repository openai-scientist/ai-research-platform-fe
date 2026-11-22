import type { Metadata } from "next";

import { JournalScreen } from "../_components/journal-screen";
import { routeId } from "../_components/writing-bank-format";

export const metadata: Metadata = {
  title: "Journal · Writing Bank · OpenAI Scientist",
  description: "A Writing Bank journal, its venue profile and its research contexts.",
};

export default async function Page({ params }: { params: Promise<{ journalId: string }> }) {
  const { journalId } = await params;
  return <JournalScreen journalId={routeId(journalId)} />;
}
