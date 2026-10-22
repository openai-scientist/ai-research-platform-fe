import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

/** The copyright, independence line and language under the sign-in and onboarding forms. */
export function AuthFooter() {
  return (
    <div className="absolute bottom-5 flex w-full items-end justify-between gap-4 px-4 sm:px-10">
      <div className="flex flex-col gap-0.5 text-sm">
        <span>{APP_CONFIG.copyright}</span>
        <span className="text-muted-foreground text-xs">{APP_CONFIG.independence}</span>
      </div>
      <div className="flex items-center gap-1 text-sm">
        <Globe className="size-4 text-muted-foreground" />
        ENG
      </div>
    </div>
  );
}
