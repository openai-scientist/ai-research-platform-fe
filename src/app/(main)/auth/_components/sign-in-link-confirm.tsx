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

import { AuthStepHeading } from "./auth-step-heading";

type LinkState = { step: "checking" } | { step: "ready"; email: string } | { step: "unusable" };

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

  useEffect(() => {
    // Kept in a ref: the fragment is gone after the first read, and effects may run twice in development.
    token.current ??= takeToken();
    const current = token.current;
    if (!current) {
      setState({ step: "unusable" });
      return;
    }
    let cancelled = false;
    // Only looks: the link stays usable, so a mail scanner opening it signs nobody in.
    fetchAuth.linkInfo(current).then(
      (info) => {
        if (!cancelled) setState({ step: "ready", email: info.email });
      },
      (error: unknown) => {
        if (cancelled) return;
        notifyAuthError(error);
        setState({ step: "unusable" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm() {
    if (!token.current || signingIn) return;
    setSigningIn(true);
    try {
      await signInWithLink(token.current);
      toast.success("Signed in successfully.");
    } catch (error) {
      notifyAuthError(error);
      setState({ step: "unusable" });
      setSigningIn(false);
    }
  }

  if (state.step === "checking") {
    return <Skeleton className="h-40 w-full" aria-label="Checking the sign-in link" />;
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
