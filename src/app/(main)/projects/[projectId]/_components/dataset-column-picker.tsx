"use client";
import { useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DatasetColumnPicker({
  id,
  label,
  value,
  columns,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  columns: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const options = [...new Set([...columns, ...(value ? [value] : [])])];
  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setSearch("");
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          className="w-full min-w-0 justify-between"
        >
          <span className="truncate">{value || "Choose a column"}</span>
          <ChevronsUpDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="Search dataset columns..."
            value={search}
            onValueChange={setSearch}
            autoComplete="off"
            name="dataset-column-search"
            data-lpignore="true"
            data-1p-ignore="true"
          />
          <CommandList>
            <CommandEmpty>No matching columns.</CommandEmpty>
            <CommandGroup>
              {options.map((column) => (
                <CommandItem key={column} value={column} onSelect={() => choose(column)}>
                  <span className="min-w-0 flex-1 truncate">{column}</span>
                  {value === column && <Check />}
                </CommandItem>
              ))}
            </CommandGroup>
            {search.trim() && !options.includes(search.trim()) && (
              <CommandGroup>
                <CommandItem value={search.trim()} onSelect={() => choose(search.trim())}>
                  Use “{search.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
