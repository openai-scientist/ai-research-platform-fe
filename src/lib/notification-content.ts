import { Flag, MessageSquare, PlugZap, UserPlus, Workflow } from "lucide-react";

import type { NotificationItem } from "@/lib/api/services/fetch-notifications";
import { researchRunUrl } from "@/lib/research-workspace";
import { NotificationKind } from "@/types/enums";

export function getNotificationContent(notification: NotificationItem) {
  const project = notification.project_name;
  const actor = notification.actor_display_name;
  const projectHref = `/projects/${encodeURIComponent(notification.project_id)}`;
  const runHref = notification.run_id ? researchRunUrl(notification.project_id, notification.run_id) : projectHref;
  // The research flow opens a run started from a topic in its workspace, and any other run on its own page.
  const flowHref = notification.run_id
    ? `${projectHref}/experiments?run=${encodeURIComponent(notification.run_id)}`
    : `${projectHref}/experiments`;

  switch (notification.kind) {
    case NotificationKind.IntegrationFailed:
      return {
        icon: PlugZap,
        text: `An integration in ${project} stopped posting. Check its settings.`,
        href: `${projectHref}/settings?tab=integrations`,
      };
    case NotificationKind.ProjectInvited:
      return {
        icon: UserPlus,
        text: actor ? `${actor} invited you to ${project}.` : `You were invited to ${project}.`,
        href: "/projects?tab=invitations",
      };
    case NotificationKind.InviteAccepted:
      return {
        icon: UserPlus,
        text: actor ? `${actor} accepted the invitation to ${project}.` : `An invitation to ${project} was accepted.`,
        href: `${projectHref}/members`,
      };
    case NotificationKind.InviteDeclined:
      return {
        icon: UserPlus,
        text: actor ? `${actor} declined the invitation to ${project}.` : `An invitation to ${project} was declined.`,
        href: `${projectHref}/members`,
      };
    case NotificationKind.MemberRoleChanged:
      return { icon: UserPlus, text: `Your role in ${project} was updated.`, href: projectHref };
    case NotificationKind.RemovedFromProject:
      return { icon: UserPlus, text: `You were removed from ${project}.`, href: "/projects" };
    case NotificationKind.AddedToProject:
      return {
        icon: UserPlus,
        text: actor ? `${actor} added you to ${project}.` : `You were added to ${project}.`,
        href: projectHref,
      };
    case NotificationKind.RunAwaitingReview:
      return {
        icon: Workflow,
        text: `A research run in ${project} needs your decision.`,
        href: notification.run_id ? `${flowHref}#frame-review` : flowHref,
      };
    case NotificationKind.RunFinished:
      // Finished also includes failed and budget-exceeded runs; do not imply success.
      return { icon: Flag, text: `A run in ${project} has finished.`, href: flowHref };
    case NotificationKind.RunCommented:
      return {
        icon: MessageSquare,
        text: actor ? `${actor} commented on a run in ${project}.` : `A run in ${project} has a new comment.`,
        href: notification.run_id ? researchRunUrl(notification.project_id, notification.run_id, "comments") : runHref,
      };
  }
}
