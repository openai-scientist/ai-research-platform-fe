"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useProfileMutations } from "@/hooks/use-profile-mutations";
import { notifyValidationError } from "@/lib/auth/form-errors";
import type { UserProfile } from "@/lib/auth/types";

import { AuthTextField } from "./auth-text-field";
import { AvatarEditor } from "./avatar-editor";

const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Please enter your display name.")
    .max(200, "Display name must be no more than 200 characters."),
});

export function ProfileEditor({
  user,
  adminUserId,
  onBusyChange,
}: {
  user: Pick<UserProfile, "id" | "email" | "display_name" | "avatar_url">;
  adminUserId?: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const mutations = useProfileMutations(adminUserId);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { display_name: user.display_name ?? user.email.split("@")[0] },
  });
  const busy = mutations.busy || avatarBusy || form.formState.isSubmitting;
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  async function onSubmit(data: z.infer<typeof profileSchema>) {
    try {
      const response = await mutations.update.mutateAsync(data.display_name);
      toast.success(response.message);
      form.reset({ display_name: response.data.display_name ?? "" });
    } catch {
      /* Mutation hook reports API errors. */
    }
  }
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit, notifyValidationError)}
      className="flex flex-col gap-4"
      aria-busy={busy}
    >
      <div className="flex items-start gap-4">
        <AvatarEditor
          name={user.display_name ?? user.email}
          avatarUrl={user.avatar_url}
          disabled={busy}
          onBusyChange={setAvatarBusy}
          onUpload={async (file) => (await mutations.upload.mutateAsync(file)).message}
          onRemove={async () => (await mutations.remove.mutateAsync()).message}
        />
        <FieldGroup className="min-w-0 flex-1 gap-4">
          <Field>
            <FieldLabel htmlFor="profile-email">Email Address</FieldLabel>
            <Input id="profile-email" type="email" value={user.email} readOnly disabled />
          </Field>
          <AuthTextField
            control={form.control}
            name="display_name"
            id="profile-name"
            label="Display name"
            autoComplete="name"
            disabled={busy}
          />
        </FieldGroup>
      </div>
      <FieldDescription>
        Click your picture to upload a PNG, JPEG, or WebP image up to 4 MiB. Pictures are cropped to a square and saved
        immediately.
      </FieldDescription>
      <Button type="submit" disabled={busy || !form.formState.isDirty}>
        {mutations.update.isPending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
