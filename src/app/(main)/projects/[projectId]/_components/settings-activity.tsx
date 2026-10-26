"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfinityScroll } from "@/hooks/use-infinity-scroll";
import { useMembersQuery } from "@/hooks/use-members-query";
import { projectKeys } from "@/lib/api/query-keys";
import { type AuditItem, type AuditListParams, fetchAdmin } from "@/lib/api/services/fetch-admin";
import type { ProjectMemberItem } from "@/lib/api/services/fetch-members";
import type { ProjectItem } from "@/lib/api/services/fetch-project";
import { isAssignableProjectRole, PROJECT_ROLE_LABELS } from "@/lib/auth/project-access";
import { ProjectRole } from "@/types/enums";

import { timeAgo } from "./dataset-format";
import { SettingsGroup, SettingsHeading } from "./settings-panel";
import { LoadMore } from "./workspace-ui";

const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

function roleLabel(value: unknown) {
  if (value === ProjectRole.ProjectManager || (typeof value === "string" && isAssignableProjectRole(value)))
    return PROJECT_ROLE_LABELS[value as ProjectRole];
  return undefined;
}

type People = (userId: unknown) => string;

/** One audit event as a sentence: what the person did, and to what. */
function describe(item: AuditItem, person: People): { verb: string; object?: string; tail?: string } {
  const details = item.details;
  const role = roleLabel(details.after ?? details.role);
  switch (item.action) {
    case "project.created":
      return { verb: "created the project" };
    case "project.updated": {
      const fields = Array.isArray(details.fields) ? details.fields.filter((field) => typeof field === "string") : [];
      return { verb: fields.length ? `edited the project's ${list.format(fields)}` : "edited the project" };
    }
    case "project.archived":
      return { verb: "archived the project" };
    case "project.restored":
      return { verb: "restored the project" };
    case "project.completed":
      return { verb: "marked the project as completed" };
    case "project.reopened":
      return { verb: "reopened the project" };
    case "project.member_invited":
      return { verb: "invited", object: person(details.user_id), tail: role && `as ${role}` };
    case "project.member_invite_sent":
      return { verb: "resent the invitation to", object: person(details.user_id) };
    case "project.member_invite_cancelled":
      return { verb: "cancelled the invitation for", object: person(details.user_id) };
    case "project.member_invite_declined":
      return { verb: "declined the invitation" };
    case "project.member_added":
      return details.user_id === item.actor_user_id
        ? { verb: "joined the project", tail: role && `as ${role}` }
        : { verb: "added", object: person(details.user_id), tail: role && `as ${role}` };
    case "project.member_role_changed":
      return { verb: "changed the role of", object: person(details.user_id), tail: role && `to ${role}` };
    case "project.member_revoked":
      return { verb: "removed", object: person(details.user_id), tail: "from the project" };
    case "dataset.created":
      return { verb: "uploaded the dataset", object: text(details.name) };
    case "dataset.version_added":
      return {
        verb: details.version_number
          ? `added version ${details.version_number} of a dataset`
          : "added a dataset version",
      };
    case "dataset.updated":
      return { verb: "edited a dataset" };
    case "dataset.deleted":
      return { verb: "deleted the dataset", object: text(details.name) };
    case "connection.created":
      return { verb: "connected", object: text(details.name) };
    case "connection.renamed":
      return { verb: "renamed a connection" };
    case "connection.deleted":
      return { verb: "removed a connection" };
    case "connection.reauthorized":
      return { verb: "reconnected a data source" };
    case "connection.tested":
      return { verb: "tested a connection" };
    case "connection.test_failed":
      return { verb: "couldn't reach a connection" };
    case "connection.previewed":
    case "connection.live_viewed":
      return { verb: "looked at data from a connection" };
    case "connection.import_started":
      return { verb: "started importing data from a connection" };
    case "project_file.uploaded":
      return { verb: "uploaded the document", object: text(details.filename) };
    case "project_file.deleted":
      return { verb: "deleted a document", object: text(details.filename) };
    case "run.created":
      // Runs started before the research case log a topic; later ones a title.
      return { verb: "started a research run on", object: text(details.title ?? details.topic) };
    case "run.paused":
      return { verb: "paused a research run" };
    case "run.resumed":
      return { verb: "resumed a research run" };
    case "run.abandoned":
      return { verb: "stopped a research run" };
    case "run.gate_answered":
      return { verb: "answered a question from a research run" };
    case "frame_review.submitted":
      return { verb: "submitted a review" };
    case "comment.deleted":
      return { verb: "deleted a comment" };
    default:
      return { verb: item.action.replace(/[_.]/g, " ") };
  }
}

function usePeople(project: ProjectItem, userId: string) {
  const members = useMembersQuery(project.id, { limit: 100, offset: 0 });
  const byId = new Map<string, ProjectMemberItem>(members.data?.data.map((member) => [member.user_id, member]));
  const name: People = (id) => {
    if (typeof id !== "string") return "someone";
    if (id === userId) return "you";
    const member = byId.get(id);
    return member ? member.display_name?.trim() || member.email : "a former member";
  };
  return { byId, name };
}

function initials(label: string) {
  const parts = label
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function ActivityRow({ item, people }: { item: AuditItem; people: ReturnType<typeof usePeople> }) {
  const member = item.actor_user_id ? people.byId.get(item.actor_user_id) : undefined;
  const actor = item.actor_user_id ? people.name(item.actor_user_id) : "System";
  const sentence = describe(item, people.name);
  const date = new Date(item.created_at);
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <Avatar className="mt-px size-6 text-[10px]">
        {member?.avatar_url && <AvatarImage src={member.avatar_url} alt="" />}
        <AvatarFallback>{member ? initials(member.display_name?.trim() || member.email) : "·"}</AvatarFallback>
      </Avatar>
      <p className="line-clamp-2 min-w-0 flex-1 text-pretty text-muted-foreground text-sm leading-6">
        <span className="font-medium text-foreground">{actor.charAt(0).toUpperCase() + actor.slice(1)}</span>{" "}
        {sentence.verb}
        {sentence.object && (
          <>
            {" "}
            <span className="break-words font-medium text-foreground">{sentence.object}</span>
          </>
        )}
        {sentence.tail && ` ${sentence.tail}`}
      </p>
      <time
        dateTime={item.created_at}
        title={date.toLocaleString("en-US")}
        className="shrink-0 pt-0.5 text-muted-foreground text-xs tabular-nums leading-5"
      >
        {timeAgo(item.created_at)}
      </time>
    </li>
  );
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function days(items: AuditItem[]) {
  const groups = new Map<string, AuditItem[]>();
  for (const item of items) {
    const day = dayLabel(item.created_at);
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }
  return [...groups];
}

function ActivitySkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4 py-3" role="status" aria-label="Loading activity">
      {Array.from({ length: rows }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows never reorder
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

/** Everything recorded in the project, newest first and grouped by day. */
export function SettingsActivity({ project, userId }: { project: ProjectItem; userId: string }) {
  const people = usePeople(project, userId);
  const query = useInfinityScroll<AuditItem, AuditListParams>({
    queryKey: [...projectKeys.detail(project.id), "audit-log"],
    fetchPage: (params, signal) => fetchAdmin.getAudit({ ...params, project_id: project.id }, signal),
    pageSize: 30,
  });
  const items = query.items;

  return (
    <div className="flex flex-col gap-6">
      <SettingsHeading title="Activity" />
      {query.isPending && <ActivitySkeleton rows={6} />}
      {query.isError && (
        <Button variant="outline" className="self-start" onClick={() => void query.refetch()}>
          Reload activity
        </Button>
      )}
      {query.isSuccess && !items.length && (
        <p className="text-muted-foreground text-sm">Nothing has happened in this project yet.</p>
      )}
      {days(items).map(([day, rows]) => (
        <SettingsGroup key={day} title={day}>
          <ul className="divide-y">
            {rows.map((item) => (
              <ActivityRow key={item.id} item={item} people={people} />
            ))}
          </ul>
        </SettingsGroup>
      ))}
      <LoadMore visible={Boolean(query.hasNextPage)} pending={query.isFetching} onClick={query.loadMore} />
    </div>
  );
}
