import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/auth-config";
import { getCurrentSession } from "@/server/auth";

import { SessionRedirect } from "./_components/session-redirect";

export default async function Home() {
  const current = await getCurrentSession();
  if (!current) redirect(LOGIN_PATH);
  return <SessionRedirect current={current} />;
}
