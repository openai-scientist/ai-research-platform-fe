export const ROLE_ADMIN = "ROLE_ADMIN";
export const ROLE_SYSTEM_ADMIN = "SYSTEM_ADMIN";
export const ROLE_PROJECT_MANAGER = "PROJECT_MANAGER";
export const ROLE_RESEARCHER = "RESEARCHER";
export const ROLE_REVIEWER = "REVIEWER";

export type UserRole =
  | typeof ROLE_ADMIN
  | typeof ROLE_SYSTEM_ADMIN
  | typeof ROLE_PROJECT_MANAGER
  | typeof ROLE_RESEARCHER
  | typeof ROLE_REVIEWER;
