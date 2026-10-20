import Image from "next/image";

import { MessageSquare } from "lucide-react";

const PROVIDER_ICONS: Record<string, string> = {
  slack: "/integrations/slack.svg",
  teams: "/integrations/microsoftteams.svg",
  discord: "/integrations/discord.svg",
};

export function ProviderMark({ provider }: { provider: string }) {
  const src = PROVIDER_ICONS[provider];
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted" aria-hidden="true">
      {src ? <Image src={src} alt="" width={24} height={24} /> : <MessageSquare className="size-5" />}
    </span>
  );
}
