"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { cn } from "cn";
import { Maximize2, Minimize2 } from "lucide-react";

import { DialogScrollArea } from "@/components/dialog-scroll-area";
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
  formHeader,
  onSubmit,
  open: controlledOpen,
  onOpenChange,
  openOnHash,
  hideSubmit = false,
  showTrigger = true,
  contentClassName,
  expandable = false,
}: {
  title: string;
  description: string;
  triggerLabel?: string;
  submitLabel: string;
  triggerVariant?: "default" | "outline";
  pending?: boolean;
  disabled?: boolean;
  children: ReactNode;
  formHeader?: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => boolean | undefined | Promise<boolean | undefined>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openOnHash?: string;
  hideSubmit?: boolean;
  showTrigger?: boolean;
  noValidate?: boolean;
  contentClassName?: string;
  expandable?: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const changeOpen = (next: boolean) => {
    if (pending) return;
    setLocalOpen(next);
    if (!next) setFullScreen(false);
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
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] min-w-0 flex-col gap-6 overflow-clip sm:max-w-2xl",
          contentClassName,
          fullScreen &&
            "top-0 left-0 h-dvh max-h-dvh max-w-none translate-x-0 translate-y-0 rounded-none sm:max-w-none",
        )}
        showCloseButton={!pending}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
          else if (fullScreen) {
            event.preventDefault();
            setFullScreen(false);
          }
        }}
      >
        {expandable && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-10"
            aria-label={fullScreen ? "Exit full screen" : "Enter full screen"}
            title={fullScreen ? "Exit full screen" : "Enter full screen"}
            aria-pressed={fullScreen}
            onClick={() => setFullScreen((value) => !value)}
          >
            {fullScreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </Button>
        )}
        <DialogHeader className={cn("shrink-0 pr-10", expandable && "pr-16")}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-pretty leading-6">{description}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className={cn("flex min-h-0 min-w-0 flex-col gap-6", expandable && "flex-1")}
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending || disabled || hideSubmit) return;
            if (await onSubmit(event)) changeOpen(false);
          }}
        >
          {formHeader && <div className="shrink-0">{formHeader}</div>}
          <DialogScrollArea data-slot="workspace-form-body" className={expandable ? "flex-1" : undefined}>
            <fieldset disabled={pending} className="min-w-0">
              {children}
            </fieldset>
          </DialogScrollArea>
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
