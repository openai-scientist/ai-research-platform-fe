"use client";

import { useState } from "react";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useAddMemberMutation,
  useInfiniteMembers,
  useRemoveMemberMutation,
  useUpdateMemberMutation,
} from "@/hooks/use-members-query";
import { ProjectRole } from "@/types/enums";

import { WorkspaceFormDialog } from "./workspace-form-dialog";
import { ConfirmAction, ListState, LoadMore, perform, RoleSelect, type WorkspaceProps } from "./workspace-ui";

export function MembersSection({ project, canManage }: WorkspaceProps) {
  const query = useInfiniteMembers(project.id);
  const add = useAddMemberMutation(project.id);
  const update = useUpdateMemberMutation(project.id);
  const remove = useRemoveMemberMutation(project.id);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ProjectRole.Researcher);
  const busy = add.isPending || update.isPending || remove.isPending;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <WorkspaceFormDialog
            title="Add member"
            triggerVariant="default"
            description="Add an existing account by email and choose its project role."
            submitLabel="Add member"
            pending={add.isPending}
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                toast.error("Enter a valid email address.");
                return;
              }
              if (await perform(() => add.mutateAsync({ email: email.trim(), role }), "Member added.")) {
                setEmail("");
                return true;
              }
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="member-email">Email</FieldLabel>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Project role</FieldLabel>
                <RoleSelect label="New member role" value={role} onChange={setRole} disabled={busy} />
              </Field>
            </FieldGroup>
          </WorkspaceFormDialog>
        </div>
      )}
      <ListState
        pending={query.isPending}
        failed={query.isError}
        empty={!query.members.length}
        title="Members"
        retry={query.refetch}
      />
      {query.members.length > 0 && (
        <DataTable
          rows={query.members ?? []}
          getRowId={(member) => member.id}
          columns={[
            { id: "Name", label: "Name", hideable: false, cell: (member) => <>{member.display_name ?? "—"}</> },
            { id: "Email", label: "Email", cell: (member) => <>{member.email}</> },
            {
              id: "Role",
              label: "Role",
              cell: (member) => (
                <>
                  {canManage ? (
                    <RoleSelect
                      label={`Project role for ${member.email}`}
                      value={member.role}
                      disabled={busy}
                      onChange={(nextRole) => {
                        if (nextRole === member.role) return;
                        void perform(
                          () => update.mutateAsync({ membershipId: member.id, role: nextRole }),
                          "Member role updated.",
                        );
                      }}
                    />
                  ) : (
                    member.role.replaceAll("_", " ")
                  )}
                </>
              ),
            },
            ...(canManage
              ? [
                  {
                    id: "Actions",
                    label: "Actions",
                    align: "right" as const,
                    cell: (member: (typeof query.members)[number]) => (
                      <>
                        <div className="flex justify-end gap-2">
                          <ConfirmAction
                            title="Remove member"
                            disabled={busy}
                            description={`Remove ${member.email} from this project?`}
                            onConfirm={() => perform(() => remove.mutateAsync(member.id), "Member removed.")}
                          />
                        </div>
                      </>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
      <LoadMore visible={Boolean(query.hasNextPage)} pending={query.isFetching} onClick={query.loadMore} />
    </div>
  );
}
