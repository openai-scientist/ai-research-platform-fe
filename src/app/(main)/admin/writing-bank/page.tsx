import type { Metadata } from "next";

import { WritingBankScreen } from "./_components/writing-bank-screen";

export const metadata: Metadata = {
  title: "Writing Bank · OpenAI Scientist",
  description: "Choose which Writing Bank journals and research contexts the writing stage offers users.",
};

export default function Page() {
  return <WritingBankScreen />;
}
