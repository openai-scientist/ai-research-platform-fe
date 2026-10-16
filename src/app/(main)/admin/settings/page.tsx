import type { Metadata } from "next";

import { AdminSettings } from "../_components/settings-page";

export const metadata: Metadata = {
  title: "Settings · OpenAI Scientist",
  description: "Manage OpenAI Scientist platform-wide settings and policies.",
};

export default function Page() {
  return <AdminSettings />;
}
