import type { ReactNode } from "react";

import { AuthFooter } from "./auth/_components/auth-footer";
import AuthShell from "./auth/_components/auth-shell";

// Sign-in, the sign-in link and onboarding share one shell, so moving between them keeps it (and its animations).
export default function SignInLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthShell>
      {children}
      <AuthFooter />
    </AuthShell>
  );
}
