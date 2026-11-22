import type { AgentRole } from "@/lib/run-stream/contract";
import type { LiveStep, ReviewThread } from "@/lib/run-stream/live-views";

import { AgentAvatar } from "../run-bits";
import { AGENTS } from "../run-meta";
import { Chip, isCurrent, itemCursor, Pending, type Tone } from "./live-ui";

const SEVERITY: Record<string, Tone> = { blocking: "bad", major: "bad", minor: "warn", note: "neutral" };

function Turn({
  agent,
  reply,
  current,
  pending,
  cursor,
  children,
}: {
  agent: AgentRole;
  reply?: boolean;
  current?: boolean;
  /** Not written yet: the turn keeps its place with a dashed border. */
  pending?: boolean;
  cursor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-cursor={cursor}
      className={`grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2.5 rounded-xl border p-3 text-[13px] ${reply ? "ml-5 border-l-2 sm:ml-8" : ""} ${current ? "border-sky-500/60 bg-sky-500/5" : ""} ${pending ? "border-dashed" : ""}`}
    >
      <AgentAvatar agent={agent} size="sm" />
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <b className={`font-medium text-xs ${AGENTS[agent].text}`}>{AGENTS[agent].name}</b>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A review as a thread: the Reviewer's challenge, the reply, whether it is closed, then the outcome. */
export function ReviewThreadView({
  step,
  reviewer = "reviewer",
  responder,
}: {
  step: LiveStep<ReviewThread>;
  reviewer?: AgentRole;
  responder: AgentRole;
}) {
  const { threads, passed } = step.content;
  return (
    <div className="grid gap-2.5">
      {threads.length === 0 && (
        <>
          <Turn agent={reviewer} current={step.cursor !== null} pending={step.progress < 1} cursor={itemCursor(0)}>
            <Pending>
              {step.progress >= 1 ? "The review recorded no challenge." : "Reading the work and writing challenges"}
            </Pending>
          </Turn>
          {step.progress < 1 && (
            <Turn agent={responder} reply pending>
              <Pending>The reply and whether each challenge closes appear here</Pending>
            </Turn>
          )}
        </>
      )}
      {threads.map((thread, index) => (
        <div key={thread.challenge} className="grid gap-2.5">
          <Turn agent={reviewer} current={isCurrent(step, index)} cursor={itemCursor(index)}>
            <div className="mb-1 flex flex-wrap gap-1.5">
              <Chip tone="warn">Challenge</Chip>
              {thread.severity && <Chip tone={SEVERITY[thread.severity] ?? "neutral"}>{thread.severity}</Chip>}
              {thread.resolved === true && <Chip tone="ok">Resolved</Chip>}
              {thread.resolved === false && <Chip tone="warn">Open</Chip>}
            </div>
            <p>{thread.challenge}</p>
            {thread.suggestion && <p className="mt-1 text-muted-foreground text-xs">Suggested: {thread.suggestion}</p>}
          </Turn>
          {thread.reply && (
            <Turn agent={responder} reply>
              <div className="mb-1">{thread.reply.outcome && <Chip>{thread.reply.outcome}</Chip>}</div>
              {thread.reply.text ? <p>{thread.reply.text}</p> : <Pending>No written reply</Pending>}
            </Turn>
          )}
        </div>
      ))}
      {passed !== null && (
        <div>
          <Chip tone={passed ? "ok" : "bad"} className="h-6 px-2.5 text-[13px]">
            {passed ? "Review passed" : "Review found open issues"}
          </Chip>
        </div>
      )}
    </div>
  );
}
