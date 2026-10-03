"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

export function WorkspaceFormDialog({
  title,
  description,
  triggerLabel = title,
  submitLabel,
  triggerVariant = "outline",
  pending = false,
  disabled = false,
  children,
  onSubmit,
  open: controlledOpen,
  onOpenChange,
  openOnHash,
  hideSubmit = false,
  showTrigger = true,
}: {
  title: string;
  description: string;
  triggerLabel?: string;
  submitLabel: string;
  triggerVariant?: "default" | "outline";
  pending?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => boolean | undefined | Promise<boolean | undefined>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openOnHash?: string;
  hideSubmit?: boolean;
  showTrigger?: boolean;
  noValidate?: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const changeOpen = (next: boolean) => {
    if (pending) return;
    setLocalOpen(next);
    onOpenChange?.(next);
    if (!next && openOnHash && window.location.hash === `#${openOnHash}`) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  };
  useEffect(() => {
    if (!openOnHash || disabled) return;
    const checkHash = () => {
      if (window.location.hash === `#${openOnHash}`) setLocalOpen(true);
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, [openOnHash, disabled]);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant={triggerVariant} className="self-start" disabled={disabled}>
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-6 overflow-clip sm:max-w-2xl"
        showCloseButton={!pending}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-pretty leading-6">{description}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex min-h-0 flex-col gap-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending || disabled || hideSubmit) return;
            if (await onSubmit(event)) changeOpen(false);
          }}
        >
          <div data-slot="workspace-form-body" className="min-h-0 overflow-y-auto p-1 pb-3">
            <fieldset disabled={pending} className="min-w-0">
              {children}
            </fieldset>
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => changeOpen(false)}>
              {hideSubmit ? "Close" : "Cancel"}
            </Button>
            {!hideSubmit && (
              <Button type="submit" className="relative" disabled={pending ? true : disabled} aria-busy={pending}>
                <span className={pending ? "invisible" : undefined}>{submitLabel}</span>
                {pending && <Spinner className="absolute" />}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
