# Platform and project role policy

## Business rules

- Platform roles are **Admin** (`platform_admin`) and **User** (`user`). They determine access to platform administration only.
- Project roles are **PM** (`project_manager`), **Researcher** (`researcher`), and **Reviewer** (`reviewer`). Permissions come from the membership of the current project.
- Either platform role can create a project. The backend creates an active PM membership for its creator.
- A PM can invite users and change their roles between Researcher and Reviewer. PM is not an invitation or role-change option.
- The creator and existing PM memberships cannot be changed or removed from the Members screen. Existing data with multiple PMs requires backend reconciliation.
- An Admin with no project membership cannot enter that project's workspace. An Admin assigned Researcher or Reviewer gets exactly that project's assigned permissions.

| Project membership | Read workspace | Research mutations | Manage members and settings |
| --- | --- | --- | --- |
| PM | Yes | Yes | Yes |
| Researcher | Yes | Yes | No |
| Reviewer | Yes | No | No |
| No membership | No | No | No |

Archived projects are read-only for every member. A PM can still open Settings and restore the project. Reviewer feedback remains available under the existing comment rules for active projects.

## Frontend implementation

`AuthUser.platform_role` and `AuthUser.projectRole` are separate. Outside a project, `projectRole` is null; it never defaults to Researcher.

`src/lib/auth/project-access.ts` defines the project permission matrix, assignable roles, and protected memberships. Workspace actions and member selectors use this policy. Member invitation and update requests also reject PM before sending an API call.

Project lists in the user workspace exclude projects whose `my_role` is null. Server routes check membership before rendering the workspace, including direct URLs. Platform administration routes retain their independent Admin guard.

All three project roles share the same Overview dashboard. Research details are readable by every member; editing details, uploading datasets and updating the research question remain limited to PM and Researcher on non-archived projects.

## Backend alignment required

This change covers the frontend repository. The sibling backend currently assigns PM correctly on project creation, but still allows platform Admin to bypass project membership and permits assigning additional PM memberships. The historical API handoff describes that older behavior.

To enforce this policy for direct API clients, the backend must also:

1. Require an active project membership for every project-scoped operation, regardless of platform role.
2. Derive read, contribute, and manage permissions from that membership only.
3. Accept only Researcher or Reviewer for invitations and membership updates.
4. Prevent changing or deleting the creator's PM membership and resolve historical additional PM memberships.
5. Keep platform administration endpoints separate from project workspace permissions.

Frontend tests and a successful build do not verify these backend authorization changes or a live multi-account workflow.
