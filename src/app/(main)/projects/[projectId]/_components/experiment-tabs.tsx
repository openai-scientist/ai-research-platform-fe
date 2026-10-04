"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ExperimentTabs({
  value,
  items,
  children,
}: {
  value: string;
  items: readonly { value: string; label: string; href: string }[];
  children: ReactNode;
}) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const outer = container.current;
    const inner = list.current;
    if (!outer || !inner) return;
    const measure = () => setCompact(inner.scrollWidth > outer.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    measure();
    return () => observer.disconnect();
  }, []);
  const selected = items.find((item) => item.value === value);
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        const item = items.find((entry) => entry.value === next);
        if (item) router.push(item.href, { scroll: false });
      }}
      className="min-w-0 gap-6"
    >
      <div ref={container} className="relative min-w-0 overflow-hidden pb-2">
        <div
          ref={list}
          className={compact ? "invisible absolute w-max" : "w-max"}
          inert={compact}
          aria-hidden={compact}
        >
          <TabsList variant="line" aria-label="Research sections" className="w-max">
            {items.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {compact && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                aria-label={`Sections: ${selected?.label ?? "Choose section"}`}
              >
                {selected?.label ?? "Sections"}
                <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {items.map((item) => (
                  <DropdownMenuItem key={item.value} asChild>
                    <Link prefetch={false} href={item.href} aria-current={item.value === value ? "page" : undefined}>
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <TabsContent value={value} className="min-w-0" aria-label={selected?.label}>
        {children}
      </TabsContent>
    </Tabs>
  );
}
