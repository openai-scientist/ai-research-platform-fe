"use client";

/* ===== The menu of a paragraph's or section's handle: the same moves as a drag, from the keyboard =====
   A paragraph goes up or down a place (past the end of its section, into the next), or to another section; a section
   goes up or down among the sections. */

import { useState } from "react";

import { ArrowDown, ArrowUp, CornerDownRight, PanelRightOpen } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { moveParagraph, moveSection, stepParagraph } from "./doc-move";
import { bodySections, useBody } from "./doc-order";

interface Target {
  kind: "paragraph" | "section";
  id: string;
  rect: DOMRect;
}
/** Opens the menu at a handle on the page. */
export const MENU: { open(t: Target): void; analysis(pid: string): void } = {
  open: () => undefined,
  analysis: () => undefined,
};

const handedOver = (state: string) => state === "kept" || state === "code";

export function MoveMenu() {
  useBody();
  const [t, setT] = useState<Target | null>(null);
  MENU.open = setT;
  const body = bodySections();
  const at = t
    ? body.findIndex((s) => (t.kind === "section" ? s.sid === t.id : s.paras.some((p) => p.pid === t.id)))
    : -1;
  const here = body[at];
  const paras = here?.paras ?? [];
  const i = t?.kind === "paragraph" ? paras.findIndex((p) => p.pid === t.id) : -1;
  const close = () => setT(null);
  return (
    <DropdownMenu open={Boolean(t)} onOpenChange={(o) => !o && close()}>
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none fixed"
          style={t ? { left: t.rect.left, top: t.rect.top, width: t.rect.width, height: t.rect.height } : undefined}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {t?.kind === "section" ? (
          <>
            <DropdownMenuItem disabled={at <= 0} onSelect={() => moveSection(t.id, at - 1)}>
              <ArrowUp />
              Move section up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={at < 0 || at >= body.length - 1} onSelect={() => moveSection(t.id, at + 1)}>
              <ArrowDown />
              Move section down
            </DropdownMenuItem>
          </>
        ) : (
          t && (
            <>
              <DropdownMenuItem disabled={at <= 0 && i <= 0} onSelect={() => stepParagraph(t.id, -1)}>
                <ArrowUp />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={at >= body.length - 1 && i >= paras.length - 1}
                onSelect={() => stepParagraph(t.id, 1)}
              >
                <ArrowDown />
                Move down
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CornerDownRight />
                  Move to section
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52">
                  {body.map((s, n) =>
                    s.sid === here?.sid ? null : (
                      <DropdownMenuItem
                        key={s.sid}
                        disabled={!handedOver(s.state)}
                        onSelect={() => moveParagraph(t.id, s.sid, Number.MAX_SAFE_INTEGER)}
                      >
                        <span className="w-4 text-muted-foreground tabular-nums">{n + 1}</span>
                        <span className="truncate">{s.heading}</span>
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => MENU.analysis(t.id)}>
                <PanelRightOpen />
                Open its analysis
              </DropdownMenuItem>
            </>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
