"use client";

import { Fragment } from "react";

import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface Crumb {
  label: string;
  href?: string;
}

/** Where a Writing Bank detail page sits, its title, what it is, and the switch that offers it to users. */
export function DetailHeader({
  crumbs,
  title,
  meta,
  description,
  aside,
}: {
  readonly crumbs: Crumb[];
  readonly title: string;
  /** Short facts under the title (badges, ids). */
  readonly meta: React.ReactNode;
  readonly description?: React.ReactNode;
  /** The switch and actions on the right. */
  readonly aside: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4">
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.label}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="font-heading text-3xl tracking-tight">{title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">{meta}</div>
          {description && <div className="max-w-3xl text-sm leading-relaxed">{description}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">{aside}</div>
      </div>
    </header>
  );
}

/** "Offered to users" with its switch; `note` says why it does not reach users yet. */
export function OfferSwitch({
  id,
  checked,
  disabled,
  label,
  note,
  onChange,
}: {
  readonly id: string;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly note?: string | null;
  readonly onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-1 lg:items-end">
      <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
        <Label htmlFor={id} className="font-medium text-sm">
          {label}
        </Label>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
      {note && <p className="max-w-xs text-muted-foreground text-sm lg:text-right">{note}</p>}
    </div>
  );
}

/** A dot between short facts in a meta line. */
export function MetaDot() {
  return (
    <span aria-hidden="true" className="text-border">
      •
    </span>
  );
}
