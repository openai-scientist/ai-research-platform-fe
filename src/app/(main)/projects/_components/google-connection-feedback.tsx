"use client";

import { useEffect } from "react";

import { toast } from "sonner";

import {
  consumeGoogleConnectionCallback,
  googleConnectionCallbackMessage,
} from "../[projectId]/_components/data-connections/google-connection-state";

export function GoogleConnectionFeedback() {
  useEffect(() => {
    const callback = consumeGoogleConnectionCallback();
    if (callback?.error) toast.error(googleConnectionCallbackMessage(callback.error));
  }, []);
  return null;
}
