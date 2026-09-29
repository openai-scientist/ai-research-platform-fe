export const AUTH_COOKIE_NAME = "research_platform_auth";
export const DEFAULT_DEMO_PASSWORD = "123456";

export const USER_ROLES = ["SYSTEM_ADMIN", "PROJECT_MANAGER", "RESEARCHER", "REVIEWER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function canAccessProjects(role: UserRole) {
  return role === "PROJECT_MANAGER" || role === "RESEARCHER";
}

export function canCreateProject(role: UserRole) {
  return role === "PROJECT_MANAGER";
}

export function getRoleHomePath(role: UserRole) {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "/admin";
    case "REVIEWER":
      return "/reviews";
    default:
      return "/projects";
  }
}

export type AuthUser = {
  email: string;
  name: string;
  role: UserRole;
};

type AuthUserRecord = AuthUser & {
  password: string;
};

export const AUTH_USERS: readonly AuthUserRecord[] = [
  {
    email: "admin@gmail.com",
    name: "System Admin",
    password: DEFAULT_DEMO_PASSWORD,
    role: "SYSTEM_ADMIN",
  },
  {
    email: "manager@gmail.com",
    name: "Project Manager",
    password: DEFAULT_DEMO_PASSWORD,
    role: "PROJECT_MANAGER",
  },
  {
    email: "researcher@gmail.com",
    name: "Researcher",
    password: DEFAULT_DEMO_PASSWORD,
    role: "RESEARCHER",
  },
  {
    email: "reviewer@gmail.com",
    name: "Reviewer",
    password: DEFAULT_DEMO_PASSWORD,
    role: "REVIEWER",
  },
] as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function findUserByCredentials(email: string, password: string): AuthUserRecord | undefined {
  const normalizedEmail = normalizeEmail(email);
  return AUTH_USERS.find((user) => user.email === normalizedEmail && user.password === password);
}

export function findUserByEmail(email: string): AuthUser | undefined {
  const normalizedEmail = normalizeEmail(email);
  return AUTH_USERS.find((user) => user.email === normalizedEmail);
}
