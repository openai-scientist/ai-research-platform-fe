import type { AuditItem } from "@/lib/api/services/fetch-admin";
import { UserStatus } from "@/types/enums";

export const actionLabels: Record<string, string> = {
  "user.status_changed": "Account status changed",
  "user.registered": "Account registered",
  "user.password_changed": "Password changed",
  "platform_admin.bootstrapped": "Initial platform admin configured",
  "platform_admin.role_granted": "Platform admin access granted",
  "platform_admin.role_removed": "Platform admin access removed",
  "project.created": "Project created",
  "project.updated": "Project updated",
  "project.archived": "Project archived",
  "project.restored": "Project restored",
  "project.completed": "Project completed",
  "project.reopened": "Project reopened",
  "project.member_added": "Project member added",
  "project.member_role_changed": "Member role changed",
  "project.member_revoked": "Project member removed",
  "dataset.created": "Dataset created",
  "dataset.updated": "Dataset updated",
  "dataset.version_added": "Dataset version added",
  "run.created": "Run created",
  "run.abandoned": "Run abandoned",
  "comment.deleted": "Comment deleted",
};

export function auditSummary(item: AuditItem, actor: string, subject: string) {
  if (item.action === "user.status_changed" && item.details.after === UserStatus.Active)
    return `${actor} activated the account for ${subject}.`;
  if (item.action === "user.status_changed" && item.details.after === UserStatus.Suspended)
    return `${actor} suspended the account for ${subject}.`;
  if (item.action === "user.registered") return `${subject} registered an account.`;
  if (item.action === "platform_admin.role_granted") return `${actor} granted platform admin access to ${subject}.`;
  if (item.action === "platform_admin.role_removed") return `${actor} removed platform admin access from ${subject}.`;
  if (item.action === "platform_admin.bootstrapped") return `${subject} was configured as the initial platform admin.`;
  return `${actor} recorded the action “${auditTitle(item)}” for ${subject}.`;
}

export function readableValue(value: string) {
  const text = value.replace(/[_.]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function auditTitle(item: AuditItem) {
  if (item.action === "user.status_changed") {
    if (item.details.after === UserStatus.Active) return "Account activated";
    if (item.details.after === UserStatus.Suspended) return "Account suspended";
    return "Account status changed";
  }
  return actionLabels[item.action] ?? readableValue(item.action);
}

export function auditTransition(item: AuditItem): { label: string; before: string; after: string } | null {
  if (
    item.action === "user.status_changed" &&
    typeof item.details.before === "string" &&
    typeof item.details.after === "string"
  ) {
    return { label: "Account status", before: item.details.before, after: item.details.after };
  }
  if (item.action === "platform_admin.role_granted" || item.action === "platform_admin.role_removed") {
    const granted = item.action === "platform_admin.role_granted";
    return {
      label: "Platform admin access",
      before: granted ? "Not granted" : "Granted",
      after: granted ? "Granted" : "Removed",
    };
  }
  return null;
}

export function dateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "Unknown date", time: "Unknown time" };
  return {
    day: date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }),
  };
}
