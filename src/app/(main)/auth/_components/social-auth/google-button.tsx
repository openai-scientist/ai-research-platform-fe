"use client";

import { type ComponentProps, use, useState } from "react";

import { cn } from "cn";
import { siGoogle } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getApiBaseUrl } from "@/lib/api/config";

type GoogleButtonProps = Pick<ComponentProps<typeof Button>, "className" | "disabled">;

export function GoogleSignInOption({ availability, disabled }: { availability: Promise<boolean>; disabled: boolean }) {
  const available = use(availability);
  if (!available) return null;

  return (
    <div className="flex flex-col gap-4">
      <GoogleButton className="w-full" disabled={disabled} />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="shrink-0 text-muted-foreground text-xs">or continue with email</span>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}

export function GoogleButton({ className, disabled }: GoogleButtonProps) {
  const [redirecting, setRedirecting] = useState(false);

  function signIn() {
    setRedirecting(true);
    // Google sets its state cookie on this navigation; fetching the endpoint would lose the OAuth flow.
    window.location.assign(`${getApiBaseUrl()}/auth/google/start`);
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(className)}
      disabled={disabled || redirecting}
      aria-busy={redirecting}
      onClick={signIn}
    >
      <SimpleIcon icon={siGoogle} data-icon="inline-start" aria-hidden="true" />
      {redirecting ? "Redirecting to Google..." : "Continue with Google"}
    </Button>
  );
}
