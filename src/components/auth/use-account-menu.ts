"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { notifyAuthError } from "@/lib/auth/form-errors";

export function useAccountMenu() {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      notifyAuthError(error);
    } finally {
      setLoggingOut(false);
    }
  };

  return { loggingOut, securityOpen, setSecurityOpen, handleLogout };
}
