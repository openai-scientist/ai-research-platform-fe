import type { Metadata } from "next";

import { AdminSettings } from "../_components/settings-page";

export const metadata: Metadata = {
  title: "Settings · ResearchLab AI",
  description: "Manage ResearchLab AI platform-wide settings and policies.",
};

export default function Page() {
  return <AdminSettings />;
}
