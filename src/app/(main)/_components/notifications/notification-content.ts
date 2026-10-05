import { Flag, MessageSquare, UserPlus, Workflow } from "lucide-react";

import type { NotificationItem } from "@/lib/api/services/fetch-notifications";
import { researchRunUrl } from "@/lib/research-workspace";
import { NotificationKind } from "@/types/enums";

export function getNotificationContent(notification: NotificationItem) {
  const project = notification.project_name;
  const actor = notification.actor_display_name;
  const projectHref = `/projects/${encodeURIComponent(notification.project_id)}`;
  const runHref = notification.run_id ? researchRunUrl(notification.project_id, notification.run_id) : projectHref;

  switch (notification.kind) {
    case NotificationKind.AddedToProject:
      return {
        icon: UserPlus,
        text: actor ? `${actor} added you to ${project}.` : `You were added to ${project}.`,
        href: projectHref,
      };
    case NotificationKind.RunAwaitingReview:
      return {
        icon: Workflow,
        text: `A run in ${project} is awaiting review.`,
        href: notification.run_id
          ? researchRunUrl(notification.project_id, notification.run_id, "frame-review")
          : runHref,
      };
    case NotificationKind.RunFinished:
      // Finished also includes failed and budget-exceeded runs; do not imply success.
      return { icon: Flag, text: `A run in ${project} has finished.`, href: runHref };
    case NotificationKind.RunCommented:
      return {
        icon: MessageSquare,
        text: actor ? `${actor} commented on a run in ${project}.` : `A run in ${project} has a new comment.`,
        href: notification.run_id ? researchRunUrl(notification.project_id, notification.run_id, "comments") : runHref,
      };
  }
}
