import type { ReactNode } from "react";

import { Command } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

import { LineBloom } from "./line-bloom";
import { SquareField } from "./square-field";

export default function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid min-h-dvh grid-cols-1 p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full overflow-hidden rounded-3xl bg-primary lg:flex">
          <div className="absolute top-10 space-y-1 px-10 text-primary-foreground">
            <Command className="size-10" />
            <h1 className="font-medium text-2xl">{APP_CONFIG.shortName}</h1>
            <p className="text-primary-foreground/70 text-sm">From a research question to hypotheses you can test.</p>
          </div>

          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-10">
            <LineBloom className="aspect-square w-full max-w-lg text-primary-foreground/80" />
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Grounded in the literature</h2>
              <p className="text-primary-foreground/70 text-sm">
                Each run searches and screens published work, and every hypothesis keeps its sources.
              </p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">You make the calls</h2>
              <p className="text-primary-foreground/70 text-sm">
                Runs pause at the steps that matter, so nothing moves on without your approval.
              </p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full min-w-0">
          <SquareField className="absolute inset-0 text-foreground/60" />
          <div data-pixel-clear className="relative flex min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
