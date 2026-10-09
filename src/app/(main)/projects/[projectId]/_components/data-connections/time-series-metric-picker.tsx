"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import type { ConnectionTable } from "@/lib/api/services/fetch-data-connections";

import { ConnectionOptionsSkeleton } from "./connection-options-skeleton";

export function TimeSeriesMetricPicker({
  id,
  label,
  value,
  tables,
  search,
  disabled,
  loading,
  onSearchChange,
  onSearch,
  onSelect,
  compact = false,
}: {
  id: string;
  label: string;
  value: string;
  tables: ConnectionTable[];
  search: string;
  disabled: boolean;
  loading: boolean;
  onSearchChange: (search: string) => void;
  onSearch: () => void;
  onSelect: (name: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const requestedSearch = useRef(search);

  useEffect(() => {
    if (!open || disabled || requestedSearch.current === search) return;
    const timer = setTimeout(() => {
      requestedSearch.current = search;
      onSearch();
    }, 350);
    return () => clearTimeout(timer);
  }, [open, disabled, search, onSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "min-w-0 justify-between px-3",
            compact
              ? "h-8 flex-1 focus-visible:ring-1 focus-visible:ring-ring/30 sm:w-64 sm:flex-none lg:w-72"
              : "h-11 w-full md:h-10",
          )}
        >
          <span className="min-w-0 truncate" title={value}>
            {value || `Choose a ${label.toLowerCase()}`}
          </span>
          {loading ? <Spinner /> : <ChevronDown data-icon="inline-end" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${label.toLowerCase()} names…`}
            value={search}
            maxLength={255}
            disabled={disabled}
            onValueChange={onSearchChange}
          />
          <CommandList aria-busy={loading}>
            {loading ? (
              <ConnectionOptionsSkeleton label={`Searching ${label.toLowerCase()} names`} />
            ) : (
              <>
                <CommandEmpty>No matching {label.toLowerCase()} names. Try another search.</CommandEmpty>
                <CommandGroup>
                  {tables.map((table) => (
                    <CommandItem
                      key={table.name}
                      value={table.name}
                      data-checked={value === table.name}
                      className="min-h-10"
                      onSelect={() => {
                        setOpen(false);
                        onSelect(table.name);
                      }}
                    >
                      <span className="min-w-0 flex-1 break-all">{table.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
