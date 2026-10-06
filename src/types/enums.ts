export enum ProjectStatus {
  Draft = "draft",
  DataReady = "data_ready",
  Researching = "researching",
  NeedsReview = "needs_review",
  Completed = "completed",
  Archived = "archived",
}

export enum RunStatus {
  Queued = "queued",
  Running = "running",
  AwaitingReview = "awaiting_review",
  Completed = "completed",
  BudgetExceeded = "budget_exceeded",
  Failed = "failed",
}

export enum UserStatus {
  Active = "active",
  Suspended = "suspended",
}

export enum ProjectRole {
  ProjectManager = "project_manager",
  Researcher = "researcher",
  Reviewer = "reviewer",
}

export enum PlatformRole {
  User = "user",
  PlatformAdmin = "platform_admin",
}

export enum FrameReviewStatus {
  Pending = "pending",
  Submitted = "submitted",
  Closed = "closed",
}

export enum ReviewSignalKind {
  Approve = "approve",
  Edit = "edit",
  Reject = "reject",
  Unknown = "unknown",
}

export enum ArtifactKind {
  PaperPdf = "paper_pdf",
  PaperTex = "paper_tex",
  Figure = "figure",
  Results = "results",
  Other = "other",
}

export enum NotificationKind {
  ProjectInvited = "project_invited",
  InviteAccepted = "invite_accepted",
  InviteDeclined = "invite_declined",
  MemberRoleChanged = "member_role_changed",
  RemovedFromProject = "removed_from_project",
  RunAwaitingReview = "run_awaiting_review",
  RunFinished = "run_finished",
  AddedToProject = "added_to_project",
  RunCommented = "run_commented",
}
