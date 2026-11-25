"use client";

import { useState } from "react";

import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { NumberRow } from "../../../projects/[projectId]/_components/settings-kit";
import {
  describeTokens,
  type FormValues,
  fieldId,
  type NumberKey,
  normalizeDomain,
  numberSpec,
} from "./platform-settings-model";

export interface PaneProps {
  form: FormValues;
  problems: Record<string, string>;
  setNumber(key: NumberKey, value: string): void;
  report(key: string): void;
}

/** One numeric setting as a settings row. Tokens show their readable form first, under the label. */
export function SpecRow({ field, form, problems, setNumber, report }: PaneProps & { field: NumberKey }) {
  const spec = numberSpec(field);
  const value = form.numbers[field];
  const readable = spec.tokens ? describeTokens(value) : null;
  return (
    <NumberRow
      id={fieldId(field)}
      label={spec.label}
      hint={
        <>
          {readable && <span className="mr-1 font-medium text-foreground tabular-nums">{readable}.</span>}
          {spec.hint}
        </>
      }
      unit={spec.unit}
      value={value}
      invalid={field in problems}
      onChange={(next) => setNumber(field, next)}
      onBlur={() => report(field)}
    />
  );
}

/** A list of sign-up domains: Enter or a comma adds, the chip's button removes. */
export function DomainsInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string[];
  onChange(value: string[]): void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const next = [...value];
    for (const piece of draft.split(/[\s,]+/)) {
      if (!piece) continue;
      const domain = normalizeDomain(piece);
      if (!domain) {
        toast.error(`"${piece}" isn't a domain. Use a name like example.com.`, { id: "platform-settings:domain" });
        return;
      }
      if (!next.includes(domain)) next.push(domain);
    }
    onChange(next);
    setDraft("");
  };
  return (
    <>
      {value.length > 0 && (
        <ul aria-label="Allowed sign-up domains" className="flex flex-wrap gap-1.5">
          {value.map((domain) => (
            <li
              key={domain}
              className="inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-muted pr-0.5 pl-2 text-sm"
            >
              <span className="truncate">{domain}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${domain}`}
                onClick={() => onChange(value.filter((item) => item !== domain))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder="example.com"
          autoComplete="off"
          className="max-w-72"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
          }}
          onBlur={() => draft.trim() && add()}
        />
        <Button type="button" variant="outline" disabled={!draft.trim()} onClick={add}>
          Add
        </Button>
      </div>
    </>
  );
}
