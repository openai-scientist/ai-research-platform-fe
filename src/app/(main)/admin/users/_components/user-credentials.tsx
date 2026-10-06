"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { UserCreated } from "@/lib/api/services/fetch-admin";

export function UserCredentials({ user }: { user: UserCreated }) {
  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(user.temporary_password);
      toast.success("Temporary password copied.");
    } catch {
      toast.error("Could not copy the password. Please copy it manually.");
    }
  }
  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor="created-user-email">Email Address</FieldLabel>
        <Input id="created-user-email" value={user.email} readOnly />
      </Field>
      <Field>
        <FieldLabel htmlFor="created-user-password">Temporary Password</FieldLabel>
        <div className="flex items-center gap-2">
          <PasswordInput
            id="created-user-password"
            value={user.temporary_password}
            readOnly
            autoComplete="off"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copy temporary password"
            onClick={() => void copyPassword()}
          >
            <Copy />
          </Button>
        </div>
        <FieldDescription>
          The user must verify their email and change this password before entering the workspace.
        </FieldDescription>
      </Field>
      <p className="text-muted-foreground text-sm">
        {user.invite_email_sent
          ? "Sign-in details were emailed to the user."
          : "The account exists, but the sign-in email was not sent. Share these credentials with the user."}
      </p>
    </FieldGroup>
  );
}
