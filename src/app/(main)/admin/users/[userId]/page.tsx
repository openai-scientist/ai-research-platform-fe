import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FlaskConical, FolderKanban, LockKeyhole, ShieldCheck, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { users } from "../../_components/admin-data";
import { AdminPageHeader, SectionCard, StatusBadge } from "../../_components/admin-primitives";

export const metadata: Metadata = {
  title: "User detail · ResearchLab AI",
  description: "Review profile, access, usage, and activity for a ResearchLab AI user.",
};

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = users.find((item) => item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === userId) ?? users[0];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Management / Users"
        title={user.name}
        description={user.email}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/users">
              <ArrowLeft data-icon="inline-start" />
              Back to users
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Account identity and access status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <p className="text-muted-foreground text-xs">Role</p>
                <Badge className="mt-1 font-mono text-[10px]" variant="outline">
                  {user.role}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <div className="mt-1">
                  <StatusBadge status={user.status} />
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Created at</p>
                <p className="mt-1 text-sm">Jan 14, 2026</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Last login</p>
                <p className="mt-1 text-sm">{user.lastActive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          <ProfileMetric icon={FolderKanban} label="Projects" value={String(user.projects)} />
          <ProfileMetric icon={FlaskConical} label="Agent runs" value="284" />
          <ProfileMetric icon={ShieldCheck} label="Experiments" value="126" />
          <ProfileMetric icon={LockKeyhole} label="Token usage" value={user.tokens} />
          <ProfileMetric icon={FlaskConical} label="Estimated cost" value={user.cost} />
          <ProfileMetric icon={ShieldCheck} label="Security events" value="2" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Projects" description="Research workspaces owned or joined by this user.">
          <div className="-mx-4 -mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Protein Folding Study</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>4 min ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Clinical Trial Signals</TableCell>
                  <TableCell>Researcher</TableCell>
                  <TableCell>2 hr ago</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </SectionCard>
        <SectionCard title="Activity" description="Recent account activity and agent runs.">
          <div className="space-y-4">
            <ActivityItem title="Completed experiment EXP-2048" time="32 min ago" />
            <ActivityItem title="Uploaded clinical-trial-v4.csv" time="2 hr ago" />
            <ActivityItem title="Signed in from Ho Chi Minh City" time="Yesterday" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function ProfileMetric({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="mt-1 font-heading text-xl tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ time, title }: { readonly time: string; readonly title: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1.5 size-2 rounded-full bg-primary" />
      <div>
        <p className="text-sm">{title}</p>
        <p className="mt-1 text-muted-foreground text-xs">{time}</p>
      </div>
    </div>
  );
}
