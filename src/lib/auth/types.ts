import type { PlatformRole, ProjectRole, UserStatus } from "@/types/enums";

export { PlatformRole, ProjectRole } from "@/types/enums";
export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  status: UserStatus;
  platform_role: PlatformRole;
  email_verified: boolean;
  must_change_password: boolean;
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
