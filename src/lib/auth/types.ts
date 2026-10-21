import type { PlatformRole, ProjectRole, UserStatus } from "@/types/enums";

export { PlatformRole, ProjectRole } from "@/types/enums";
export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  platform_role: PlatformRole;
  email_verified: boolean;
  // False until the user has chosen a name; the app asks for one before anything else.
  onboarded: boolean;
  created_at: string;
}
/** A profile as an endpoint that edits it returns it, which may leave out `onboarded`. */
export type ProfileChange = Omit<UserProfile, "onboarded"> & Partial<Pick<UserProfile, "onboarded">>;
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
