"use client";

import { CircleUser, CreditCard, EllipsisVertical, LogOut, MessageSquareDot } from "lucide-react";

import { AccountSecurityDialog } from "@/components/auth/account-security-dialog";
import { useAccountMenu } from "@/components/auth/use-account-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { resolveAvatarUrl } from "@/lib/auth/avatar";
import { getInitials } from "@/lib/utils";

export function NavUser({
  user,
}: {
  readonly user: {
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { user: account, loggingOut, securityOpen, setSecurityOpen, handleLogout } = useAccountMenu();
  const displayedUser = account
    ? {
        name: account.display_name ?? account.email,
        email: account.email,
        avatar: account.avatar_url ?? "",
      }
    : user;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg grayscale">
                  <AvatarImage
                    src={resolveAvatarUrl(displayedUser.avatar)}
                    alt={displayedUser.name}
                    crossOrigin="use-credentials"
                  />
                  <AvatarFallback className="rounded-lg text-foreground">
                    {getInitials(displayedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayedUser.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{displayedUser.email}</span>
                </div>
                <EllipsisVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={resolveAvatarUrl(displayedUser.avatar)}
                      alt={displayedUser.name}
                      crossOrigin="use-credentials"
                    />
                    <AvatarFallback className="rounded-lg text-foreground">
                      {getInitials(displayedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayedUser.name}</span>
                    <span className="truncate text-muted-foreground text-xs">{displayedUser.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setSecurityOpen(true)}>
                  <CircleUser />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquareDot />
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
        </SidebarMenuItem>
      </SidebarMenu>
      <AccountSecurityDialog open={securityOpen} onOpenChange={setSecurityOpen} />
    </>
  );
}
