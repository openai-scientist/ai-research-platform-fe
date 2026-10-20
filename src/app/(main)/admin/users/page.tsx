import type { Metadata } from "next";

import { AdminUsers } from "./_components/admin-users";

export const metadata: Metadata = {
  title: "Users · OpenAI Scientist",
  description: "Manage the fixed OpenAI Scientist system accounts and their activity.",
};

export default function Page() {
  return <AdminUsers />;
}
