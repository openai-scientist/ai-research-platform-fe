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
  const activeUser = users[0];
  const { loggingOut, securityOpen, setSecurityOpen, handleLogout } = useAccountMenu();

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
            className="rounded-lg focus-visible:outline-ring focus-visible:outline-2"
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
              <AvatarFallback>{getInitials(activeUser.name)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
          <DropdownMenuGroup>
            {users.map((user) => (
              <DropdownMenuItem
                key={user.email}
                className={cn("p-0", user.id === activeUser.id && "bg-accent/50")}
                aria-current={user.id === activeUser.id ? "true" : undefined}
              >
                <div className="flex w-full items-center gap-2 px-1 py-1.5">
                  <Avatar className="size-9 rounded-lg">
                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs capitalize">{user.role}</span>
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
