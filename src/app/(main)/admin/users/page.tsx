import type { Metadata } from "next";

import type { UserRow } from "../../dashboard/users/_components/data";
import { Users } from "../../dashboard/users/_components/users";

export const metadata: Metadata = {
  title: "Users · ResearchLab AI",
  description: "Manage the fixed ResearchLab AI system accounts and their activity.",
};

const adminUsers: UserRow[] = [
  {
    email: "admin@gmail.com",
    joinedDate: "01 Sep 2026, 9:00 AM",
    lastActive: 0,
    name: "System Administrator",
    role: "SYSTEM_ADMIN",
    status: "Active",
    team: "Platform",
    workspace: ["ResearchLab AI"],
  },
  {
    email: "manager@gmail.com",
    joinedDate: "01 Sep 2026, 9:10 AM",
    lastActive: 2,
    name: "Project Manager",
    role: "PROJECT_MANAGER",
    status: "Active",
    team: "Platform",
    workspace: ["ResearchLab AI"],
  },
  {
    email: "researcher@gmail.com",
    joinedDate: "01 Sep 2026, 9:20 AM",
    lastActive: 18,
    name: "Researcher",
    role: "RESEARCHER",
    status: "Active",
    team: "Platform",
    workspace: ["ResearchLab AI"],
  },
  {
    email: "reviewer@gmail.com",
    joinedDate: "01 Sep 2026, 9:30 AM",
    lastActive: 60,
    name: "Reviewer",
    role: "REVIEWER",
    status: "Active",
    team: "Platform",
    workspace: ["ResearchLab AI"],
  },
];

export default function Page() {
  return (
    <Users
      description="Manage the four fixed system accounts used by the ResearchLab AI platform."
      roleOptions={["All", "SYSTEM_ADMIN", "PROJECT_MANAGER", "RESEARCHER", "REVIEWER"]}
      teamOptions={["All", "Platform"]}
      title="Users"
      users={adminUsers}
      workspaceOptions={["All", "ResearchLab AI"]}
    />
  );
}
