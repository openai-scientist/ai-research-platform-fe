import type { QueryFilters } from "@tanstack/react-query";

import { adminKeys, authKeys, integrationKeys, invitationKeys, projectKeys, workspaceKeys } from "@/lib/api/query-keys";
import type { NotificationItem } from "@/lib/api/services/fetch-notifications";
import { NotificationKind } from "@/types/enums";

export function getNotificationQueryFilters(notification: NotificationItem): QueryFilters[] {
  const projectId = notification.project_id;
  const runId = notification.run_id;
  const project = { queryKey: projectKeys.detail(projectId), exact: true };
  const members = { queryKey: projectKeys.memberLists(projectId) };
  const lists = { queryKey: projectKeys.lists() };
  const research = { queryKey: projectKeys.managerResearch(projectId) };
  const review = { queryKey: [...projectKeys.detail(projectId), "review-workspace"] };
  const audit = [
    { queryKey: adminKeys.auditLists() },
    { queryKey: [...projectKeys.detail(projectId), "audit"] },
    { queryKey: workspaceKeys.activity(projectId) },
  ];

  switch (notification.kind) {
    case NotificationKind.BudgetWarning:
    case NotificationKind.BudgetExceeded:
      return [{ queryKey: workspaceKeys.spending(projectId) }, { queryKey: projectKeys.runLists(projectId) }, ...audit];
    case NotificationKind.IntegrationFailed:
      return [{ queryKey: integrationKeys.project(projectId) }, ...audit];
    case NotificationKind.ProjectInvited:
      return [{ queryKey: invitationKeys.all }, ...audit];
    case NotificationKind.InviteAccepted:
    case NotificationKind.InviteDeclined:
      return [{ queryKey: invitationKeys.all }, members, project, lists, research, ...audit];
    case NotificationKind.MemberRoleChanged:
    case NotificationKind.RemovedFromProject:
    case NotificationKind.AddedToProject:
      return [{ queryKey: authKeys.me }, { queryKey: projectKeys.detail(projectId) }, lists, ...audit];
    case NotificationKind.RunAwaitingReview:
    case NotificationKind.RunFinished:
      return [
        { queryKey: workspaceKeys.spending(projectId) },
        project,
        lists,
        research,
        review,
        { queryKey: projectKeys.runLists(projectId) },
        ...(runId ? [{ queryKey: projectKeys.run(projectId, runId) }] : []),
        { queryKey: adminKeys.usageLists() },
        ...audit,
      ];
    case NotificationKind.RunCommented:
      return [research, review, ...(runId ? [{ queryKey: projectKeys.run(projectId, runId) }] : []), ...audit];
  }
}

export function notificationChangesMembership(notification: NotificationItem) {
  return (
    notification.kind === NotificationKind.MemberRoleChanged ||
    notification.kind === NotificationKind.RemovedFromProject ||
    notification.kind === NotificationKind.AddedToProject
  );
}
