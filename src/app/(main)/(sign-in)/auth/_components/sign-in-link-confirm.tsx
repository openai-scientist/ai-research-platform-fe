"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { fetchAuth } from "@/lib/api/services/fetch-auth";
import { LOGIN_PATH } from "@/lib/auth/auth-config";
import { notifyAuthError } from "@/lib/auth/form-errors";
import { ApiError } from "@/types/api";

import { AuthStepHeading } from "./auth-step-heading";

type LinkState =
  | { step: "checking" }
  | { step: "ready"; email: string }
  | { step: "unusable" }
  // The server could not be reached or failed: the link may still be good.
  | { step: "failed" };

/** A refused link (expired, used, unknown) is final; a network or server failure is worth another try. */
function refused(error: unknown) {
  return error instanceof ApiError && error.status < 500 && error.code !== "RATE_LIMITED";
}

/** Reads the token from the fragment once, then removes it so it stays out of history and referrers. */
function takeToken(): string | null {
  const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
  if (window.location.hash) {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
  }
  return token;
}

export function SignInLinkConfirm() {
  const { signInWithLink } = useAuth();
  const token = useRef<string | null | undefined>(undefined);
  const [state, setState] = useState<LinkState>({ step: "checking" });
  const [signingIn, setSigningIn] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` is the retry trigger
  useEffect(() => {
    // Kept in a ref: the fragment is gone after the first read, and effects may run twice in development.
    token.current ??= takeToken();
    const current = token.current;
    if (!current) {
      setState({ step: "unusable" });
      return;
    }
    let cancelled = false;
    setState({ step: "checking" });
    // Only looks: the link stays usable, so a mail scanner opening it signs nobody in.
    fetchAuth.linkInfo(current).then(
      (info) => {
        if (!cancelled) setState({ step: "ready", email: info.email });
      },
      (error: unknown) => {
        if (cancelled) return;
        notifyAuthError(error);
        setState({ step: refused(error) ? "unusable" : "failed" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  async function confirm() {
    if (!token.current || signingIn) return;
    setSigningIn(true);
    try {
      await signInWithLink(token.current);
      toast.success("Signed in successfully.");
    } catch (error) {
      notifyAuthError(error);
      // Still on the confirm screen after a failure that isn't the link's fault, so Sign in can be pressed again.
      if (refused(error)) setState({ step: "unusable" });
      setSigningIn(false);
    }
  }

  if (state.step === "checking") {
    return <Skeleton className="h-40 w-full" aria-label="Checking the sign-in link" />;
  }
  if (state.step === "failed") {
    return (
      <div className="flex flex-col gap-6">
        <AuthStepHeading
          title="Couldn't check this link"
          description="Check your connection and try again. The link still works until it expires."
        />
        <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
        <Button asChild variant="link">
          <Link href={LOGIN_PATH}>Back to sign in</Link>
        </Button>
      </div>
    );
  }
  if (state.step === "unusable") {
    return (
      <div className="flex flex-col gap-6">
        <AuthStepHeading
          title="This link no longer works"
          description="Sign-in links work once and expire after a few minutes. Request a new code to continue."
        />
        <Button asChild>
          <Link href={LOGIN_PATH}>Back to sign in</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <AuthStepHeading title="Confirm sign-in" description={`Sign in as ${state.email}?`} />
      <Button onClick={() => void confirm()} disabled={signingIn}>
        {signingIn ? "Signing in..." : "Sign in"}
      </Button>
      <Button asChild variant="link">
        <Link href={LOGIN_PATH}>Use a different email</Link>
      </Button>
    </div>
  );
}
