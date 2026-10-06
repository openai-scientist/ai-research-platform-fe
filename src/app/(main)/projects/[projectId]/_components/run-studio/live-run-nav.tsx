"use client";

import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useProjectRun, useRunStudio } from "@/lib/run-stream/run-store";
import { displayStatus } from "@/lib/run-stream/selectors";

import { PulseDot } from "./run-bits";
import { STAGE_SHORT, STATUS_TONE } from "./run-meta";

/** The project's run in the sidebar, so you can get back to it from anywhere and see when it needs you. */
export function LiveRunNav({ projectId }: { projectId: string }) {
  const session = useProjectRun(projectId);
  const openWorkspace = useRunStudio((s) => s.openWorkspace);
  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <SidebarGroup>
            <SidebarGroupLabel>Research run</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip={session.label}
                  onClick={(e) => openWorkspace(session.runId, e.currentTarget)}
                  className={cn(session.state.gate && "ring-1 ring-amber-500/60")}
                >
                  {(() => {
                    const status = displayStatus(session.state);
                    const stage = session.state.currentStageKey
                      ? session.state.stages[session.state.currentStageKey]
                      : undefined;
                    const where = session.state.completed
                      ? session.state.paperTitle
                        ? "Paper published"
                        : "Hypotheses ready"
                      : session.state.gate
                        ? "Needs you"
                        : stage
                          ? `${STAGE_SHORT[stage.plan.stage]}${stage.plan.round ? ` · Round ${stage.plan.round}` : ""}`
                          : "Starting";
                    return (
                      <>
                        <PulseDot
                          className={STATUS_TONE[status].dot}
                          pulse={status === "running" || status === "waiting"}
                        />
                        <span className="flex min-w-0 flex-col leading-tight">
                          <b className="font-mono font-semibold text-xs">{session.label}</b>
                          <span
                            className={cn(
                              "truncate text-xs",
                              session.state.gate
                                ? "font-medium text-amber-700 dark:text-amber-300"
                                : "text-muted-foreground",
                            )}
                          >
                            {where}
                          </span>
                        </span>
                      </>
                    );
                  })()}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
