"use client";

import { format, startOfMonth } from "date-fns";
import { UserCheck, UserPlus, Users as UsersIcon, UserX } from "lucide-react";

import { useUsersQuery } from "@/hooks/use-admin-query";
import type { UserListParams } from "@/lib/api/services/fetch-admin";
import { PlatformRole, UserStatus } from "@/types/enums";

import { MetricCard } from "../../_components/admin-primitives";

/** The list endpoint caps a page at 100 and returns the newest accounts first. */
const RECENT_PAGE = 100;

const count = new Intl.NumberFormat("en-US");

function useTotal(params: UserListParams, enabled: boolean) {
  const query = useUsersQuery({ ...params, limit: 1, offset: 0 }, { enabled });
  const total = query.data?.meta.pagination?.total;
  return typeof total === "number" ? total : null;
}

/** Account counts from the users list itself: each card asks for one page of one row and reads its total. */
export function UserStats({ enabled }: { readonly enabled: boolean }) {
  const total = useTotal({}, enabled);
  const active = useTotal({ status: UserStatus.Active }, enabled);
  const suspended = useTotal({ status: UserStatus.Suspended }, enabled);
  const admins = useTotal({ platform_role: PlatformRole.PlatformAdmin }, enabled);
  const recent = useUsersQuery({ limit: RECENT_PAGE, offset: 0 }, { enabled });

  const monthStart = startOfMonth(new Date());
  const recentRows = recent.data?.data;
  const joined = recentRows?.filter((user) => new Date(user.created_at) >= monthStart).length;
  // Every row of the page joined this month and more exist: the true number is at least the page.
  const capped = joined === RECENT_PAGE && (total ?? 0) > RECENT_PAGE;

  const show = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : count.format(value);
  let suspendedDetail: string | undefined;
  if (suspended !== null)
    suspendedDetail = suspended > 0 ? "Cannot sign in until reactivated" : "No suspended accounts";
  const share = total && active !== null ? `${Math.round((active / total) * 100)}% of all accounts` : undefined;

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <MetricCard
        label="Total users"
        value={show(total)}
        icon={UsersIcon}
        detail={admins === null ? undefined : `${count.format(admins)} platform ${admins === 1 ? "admin" : "admins"}`}
      />
      <MetricCard label="Active users" value={show(active)} icon={UserCheck} detail={share} />
      <MetricCard label="Suspended users" value={show(suspended)} icon={UserX} detail={suspendedDetail} />
      <MetricCard
        label="New this month"
        value={capped ? `${count.format(RECENT_PAGE)}+` : show(joined)}
        icon={UserPlus}
        detail={`Since ${format(monthStart, "d MMM")}`}
      />
    </div>
  );
}
