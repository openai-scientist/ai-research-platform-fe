"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Camera, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { prepareAvatar, resolveAvatarUrl } from "@/lib/auth/avatar";
import { getInitials } from "@/lib/utils";

export function AvatarEditor({
  name,
  avatarUrl,
  disabled,
  onUpload,
  onRemove,
  onBusyChange,
}: {
  name: string;
  avatarUrl: string | null;
  disabled: boolean;
  onUpload: (file: File) => Promise<string>;
  onRemove: () => Promise<string>;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const busy = disabled || uploading;
  async function choose(file: File) {
    if (busy) return;
    setUploading(true);
    onBusyChange(true);
    try {
      let prepared: File;
      try {
        prepared = await prepareAvatar(file);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not prepare your image.");
        return;
      }
      setPreview(URL.createObjectURL(prepared));
      try {
        toast.success(await onUpload(prepared));
      } catch {
        /* Mutation hook reports API errors; the saved avatar is restored below. */
      }
    } finally {
      setPreview(null);
      setUploading(false);
      onBusyChange(false);
    }
  }
  async function remove() {
    if (busy) return;
    try {
      toast.success(await onRemove());
    } catch {
      /* Mutation hook reports API errors. */
    }
  }
  return (
    <Field className="w-20 shrink-0 items-center gap-2" aria-busy={busy}>
      <FieldLabel className="sr-only" htmlFor={inputId}>
        Profile picture
      </FieldLabel>
      <Input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void choose(file);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        className="relative size-20 rounded-full p-0"
        disabled={busy}
        aria-label={uploading ? "Uploading profile picture" : "Change profile picture"}
        onClick={() => inputRef.current?.click()}
      >
        <Avatar className="size-20">
          <AvatarImage src={preview ?? resolveAvatarUrl(avatarUrl)} alt={name} crossOrigin="use-credentials" />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
          {uploading ? <LoaderCircle className="motion-safe:animate-spin" /> : <Camera />}
        </span>
      </Button>
      {avatarUrl && (
        <Button
          type="button"
          variant="link"
          size="sm"
          disabled={busy}
          aria-label="Remove profile picture"
          onClick={() => void remove()}
        >
          Remove
        </Button>
      )}
    </Field>
  );
}
