"use client";

import { useEffect } from "react";

import { toast } from "sonner";

function getErrorMessage(code: string): string {
  switch (code) {
    case "GOOGLE_EMAIL_NOT_VERIFIED":
      return "Use a verified Gmail or Google Workspace account, or sign in with your password.";
    case "USER_SUSPENDED":
      return "This account is suspended. Please contact an administrator.";
    case "GOOGLE_SIGN_IN_FAILED":
      return "Google sign-in was unsuccessful. Please try again.";
    default:
      return "Unable to sign in with Google. Please try again.";
  }
}

export function GoogleSignInFeedback() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");
    if (error === null) return;

    // Consume first so Strict Mode, reloads and browser history cannot replay the toast.
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    toast.error(getErrorMessage(error));
  }, []);

  return null;
}
