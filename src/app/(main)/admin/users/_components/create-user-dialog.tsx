"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useCreateUserMutation } from "@/hooks/use-admin-query";
import type { UserCreated } from "@/lib/api/services/fetch-admin";
import { notifyValidationError } from "@/lib/auth/form-errors";
import { emailSchema } from "@/lib/auth/schemas";

const createSchema = emailSchema.extend({
  display_name: z.string().trim().max(200, "Display name must be no more than 200 characters."),
  send_email: z.boolean(),
});

export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateUserMutation();
  const [created, setCreated] = useState<UserCreated | null>(null);
  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", display_name: "", send_email: true },
  });
  const busy = create.isPending || form.formState.isSubmitting;
  async function onSubmit(data: z.infer<typeof createSchema>) {
    try {
      const response = await create.mutateAsync({
        email: data.email,
        send_email: data.send_email,
        ...(data.display_name ? { display_name: data.display_name } : {}),
      });
      setCreated(response.data);
      form.reset();
      toast.success(response.message);
    } catch {
      /* Mutation hook reports API errors. */
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        showCloseButton={!busy}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{created ? "User created" : "Add user"}</DialogTitle>
          <DialogDescription>
            {created ? created.email : "Create a standard user. They sign in with a code sent to their email."}
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <>
            <p className="text-muted-foreground text-sm">
              {created.invite_email_sent
                ? "An email told the user how to sign in."
                : "No email was sent. Ask the user to sign in with this address."}
            </p>
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </>
        ) : (
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit, notifyValidationError)}
            className="flex flex-col gap-4"
            aria-busy={busy}
          >
            <FieldGroup className="gap-4">
              <AuthTextField
                control={form.control}
                name="email"
                id="new-user-email"
                label="Email Address"
                type="email"
                autoComplete="email"
                disabled={busy}
              />
              <AuthTextField
                control={form.control}
                name="display_name"
                id="new-user-name"
                label="Display Name (optional)"
                autoComplete="name"
                disabled={busy}
              />
              <Controller
                control={form.control}
                name="send_email"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      id="send-user-email"
                      checked={field.value}
                      onCheckedChange={(value) => field.onChange(value === true)}
                      disabled={busy}
                    />
                    <FieldLabel htmlFor="send-user-email">Email sign-in details to the user</FieldLabel>
                  </Field>
                )}
              />
            </FieldGroup>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create user"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
