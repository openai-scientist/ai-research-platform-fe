export type ProjectRole = "project_manager" | "researcher" | "reviewer";
export type PlatformRole = "platform_admin";
export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  status: "active" | "suspended";
  platform_role: PlatformRole | null;
  created_at: string;
}
export interface SessionDetails {
  created_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
}
export interface MembershipSummary {
  project_id: string;
  project_name: string;
  role: ProjectRole;
  archived: boolean;
}
export interface SessionResult {
  user: UserProfile;
  session: SessionDetails;
  csrf_token: string;
}
export interface CurrentUser {
  user: UserProfile;
  session: SessionDetails;
  memberships: MembershipSummary[];
}
