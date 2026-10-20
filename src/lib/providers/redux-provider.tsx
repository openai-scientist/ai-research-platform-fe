"use client";

import { type ReactNode, useRef } from "react";

import { Provider } from "react-redux";

import { type AppStore, createAuthStore } from "@/lib/redux/store";

export function ReduxProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = createAuthStore();
  return <Provider store={storeRef.current}>{children}</Provider>;
}
