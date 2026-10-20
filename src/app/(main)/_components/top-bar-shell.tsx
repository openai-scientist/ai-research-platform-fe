import type { ReactNode } from "react";

import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { APP_CONFIG } from "@/config/app-config";
import type { AuthUser } from "@/lib/auth/auth-config";

import { AccountSwitcher } from "../dashboard/_components/header/account-switcher";
import { LayoutControls } from "../dashboard/_components/header/layout-controls";
import { ThemeSwitcher } from "../dashboard/_components/header/theme-switcher";
import { NotificationBell } from "./notifications/notification-bell";

export function TopBarShell({
  children,
  homeUrl,
  user,
}: {
  readonly children: ReactNode;
  readonly homeUrl: string;
  readonly user: AuthUser;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-10 border-b bg-canvas/95 backdrop-blur supports-backdrop-filter:bg-canvas/80">
        <div className="mx-auto flex h-12 w-full max-w-screen-xl items-center justify-between gap-4 px-4 lg:px-6">
          <Link prefetch={false} href={homeUrl} className="flex items-center gap-2 rounded-md font-semibold">
            <BrandMark className="size-5" />
            <span className="truncate">{APP_CONFIG.shortName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <LayoutControls />
            <ThemeSwitcher />
            <AccountSwitcher
              users={[{ id: user.email, name: user.name, email: user.email, avatar: "", role: user.platform_role }]}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-xl flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
