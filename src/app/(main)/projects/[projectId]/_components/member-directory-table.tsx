import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectMemberItem } from "@/lib/api/services/fetch-members";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { PROJECT_ROLE_LABELS } from "@/lib/auth/project-access";
import { getInitials } from "@/lib/utils";

export function MemberDirectoryTable({
  members,
  ownerId,
  userId,
}: {
  members: ProjectMemberItem[];
  ownerId: string;
  userId: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <Table className="table-fixed" aria-label="Project members">
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="px-4">
              Member
            </TableHead>
            <TableHead scope="col" className="w-36 px-4 sm:w-44">
              Role
            </TableHead>
            <TableHead scope="col" className="hidden w-36 px-4 md:table-cell">
              Added
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const name = member.display_name?.trim() || member.email;
            return (
              <TableRow key={member.id}>
                <TableCell className="whitespace-normal p-4">
                  <div className="flex min-w-0 items-start gap-3 sm:items-center">
                    <Avatar>
                      <AvatarImage src={resolveAvatarUrl(member.avatar_url)} alt="" crossOrigin="use-credentials" />
                      <AvatarFallback>{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="break-words font-medium [overflow-wrap:anywhere]">{name}</span>
                        {member.user_id === ownerId && <Badge variant="outline">Owner</Badge>}
                        {member.user_id === userId && <Badge variant="outline">You</Badge>}
                      </div>
                      {name !== member.email && (
                        <p className="break-all text-muted-foreground text-xs">{member.email}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="p-4">
                  <Badge variant="default" className="h-7 px-3">
                    {PROJECT_ROLE_LABELS[member.role]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden p-4 text-muted-foreground md:table-cell">
                  <time dateTime={member.created_at}>
                    {new Date(member.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
