"use client";

import { cn } from "cn";
import { BadgeCheck, Bell, Check, CreditCard, LogOut } from "lucide-react";

import { AccountSecurityDialog } from "@/components/auth/account-security-dialog";
import { useAccountMenu } from "@/components/auth/use-account-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PLATFORM_ROLE_LABELS } from "@/lib/auth/auth-config";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { getInitials } from "@/lib/utils";

export function AccountSwitcher({
  users,
}: {
  readonly users: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
    readonly role: string;
  }>;
}) {
  const { user: account, loggingOut, securityOpen, setSecurityOpen, handleLogout } = useAccountMenu();
  const displayedUsers = users.map((user) =>
    account && user.email === account.email
      ? {
          ...user,
          name: account.display_name ?? account.email,
          avatar: account.avatar_url ?? "",
          role: PLATFORM_ROLE_LABELS[account.platform_role],
        }
      : user,
  );
  const activeUser = displayedUsers[0];

  if (!activeUser) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open account menu"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage
                src={resolveAvatarUrl(activeUser.avatar)}
                alt={activeUser.name}
                crossOrigin="use-credentials"
              />
              <AvatarFallback className="text-foreground">{getInitials(activeUser.name)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
          <DropdownMenuGroup>
            {displayedUsers.map((user) => (
              <DropdownMenuItem
                key={user.email}
                className={cn("p-0", user.id === activeUser.id && "bg-accent/50")}
                aria-current={user.id === activeUser.id ? "true" : undefined}
              >
                <div className="flex w-full items-center gap-2 px-1 py-1.5">
                  <Avatar className="size-9 rounded-lg">
                    <AvatarImage src={resolveAvatarUrl(user.avatar)} alt={user.name} crossOrigin="use-credentials" />
                    <AvatarFallback className="text-foreground">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">
                      {Object.entries(PLATFORM_ROLE_LABELS).find(([role]) => role === user.role)?.[1] ?? user.role}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "mr-1 flex size-5 items-center justify-center rounded-full text-primary opacity-0",
                      user.id === activeUser.id && "opacity-100",
                    )}
                  >
                    <Check aria-hidden="true" />
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setSecurityOpen(true)}>
              <BadgeCheck />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell />
              Notifications
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => void handleLogout()} disabled={loggingOut}>
              <LogOut />
              {loggingOut ? "Signing out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountSecurityDialog open={securityOpen} onOpenChange={setSecurityOpen} />
    </>
  );
}
