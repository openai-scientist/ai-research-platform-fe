"use client";

import { useState } from "react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";

import { SaveBar } from "../../../projects/[projectId]/_components/settings-panel";
import { fieldId, type NumberKey, numberSpec } from "./platform-settings-model";
import { usePlatformSettings } from "./use-platform-settings";

const budgetGroups = [
  {
    title: "Run budgets",
    description: "The starting budget and the cap for a single run.",
    fields: [
      { key: "run_default_token_budget", label: "Default budget" },
      { key: "run_max_token_budget", label: "Maximum budget" },
    ],
  },
  {
    title: "Monthly limits",
    description: "Limits apply per calendar month (UTC).",
    fields: [
      { key: "user_monthly_token_limit", label: "Per user" },
      { key: "platform_monthly_token_limit", label: "Whole platform" },
    ],
  },
] as const;

const rateField = "credits_per_million_tokens";

export function TokenLimitsSettings() {
  const settings = usePlatformSettings("tokens");
  const { form, query } = settings;
  const [touched, setTouched] = useState<ReadonlySet<NumberKey>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const resetValidation = () => {
    setTouched(new Set());
    setSubmitted(false);
  };

  const fieldProps = (field: NumberKey, value: string) => ({
    field,
    value,
    invalid: (submitted || touched.has(field)) && field in settings.problems,
    onChange: (next: string) => settings.setNumber(field, next),
    onBlur: () => {
      setTouched((current) => new Set(current).add(field));
      settings.report(field);
    },
  });

  return (
    <div className="@container/token-limits flex w-full min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-heading font-medium text-lg">Token limits</h2>
        <p className="text-muted-foreground text-sm">All limits include input and output tokens.</p>
      </header>

      {form ? (
        <form
          id="token-limits"
          noValidate
          aria-label="Token limits"
          onSubmit={(event) => {
            event.preventDefault();
            if (!settings.dirty) return;
            const [first] = Object.keys(settings.problems);
            if (first) {
              setSubmitted(true);
              settings.report(first);
              document.getElementById(fieldId(first))?.focus();
              return;
            }
            resetValidation();
            settings.save();
          }}
        >
          <FieldGroup className="gap-4">
            <div className="grid gap-4 @2xl/token-limits:grid-cols-2">
              {budgetGroups.map((group) => (
                <Card key={group.title}>
                  <CardHeader>
                    <CardTitle>{group.title}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup className="gap-3">
                      {group.fields.map(({ key, label }) => (
                        <TokenNumberField key={key} {...fieldProps(key, form.numbers[key])} label={label} />
                      ))}
                    </FieldGroup>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent>
                <TokenNumberField
                  {...fieldProps(rateField, form.numbers[rateField])}
                  label={numberSpec(rateField).label}
                  description={
                    settings.supportsCreditRate
                      ? "Rate changes apply from the next settings version."
                      : "Update the backend to edit the credit rate."
                  }
                  placeholder={settings.supportsCreditRate ? "Enter rate" : "Unavailable"}
                  disabled={!settings.supportsCreditRate}
                />
              </CardContent>
            </Card>
          </FieldGroup>
        </form>
      ) : (
        <LoadState failed={query.isError} fetching={query.isFetching} retry={() => void query.refetch()} />
      )}

      <SaveBar
        dirty={settings.dirty}
        pending={settings.pending}
        form="token-limits"
        onDiscard={() => {
          resetValidation();
          settings.discard();
        }}
      />
    </div>
  );
}

function TokenNumberField({
  field,
  label,
  description,
  disabled,
  placeholder,
  value,
  invalid,
  onChange,
  onBlur,
}: {
  field: NumberKey;
  label: string;
  description?: string;
  disabled?: boolean;
  placeholder?: string;
  value: string;
  invalid: boolean;
  onChange(value: string): void;
  onBlur(): void;
}) {
  const [focused, setFocused] = useState(false);
  const id = fieldId(field);
  const unitId = `${id}-unit`;
  const descriptionId = `${id}-description`;
  const displayValue = !focused && /^\d+$/.test(value) ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : value;

  return (
    <Field
      orientation="horizontal"
      data-disabled={disabled}
      data-invalid={invalid}
      className={cn("flex-wrap justify-between gap-x-4", description && "flex-col @md/token-limits:flex-row")}
    >
      <FieldContent className={cn("min-w-28 self-center", description && "self-start @md/token-limits:self-center")}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      </FieldContent>
      <InputGroup
        className={cn("w-44 max-w-full shrink-0 self-center", description && "self-start @md/token-limits:self-center")}
      >
        <InputGroupInput
          id={id}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          className="min-w-0 tabular-nums"
          placeholder={placeholder}
          aria-invalid={invalid}
          aria-describedby={description ? `${unitId} ${descriptionId}` : unitId}
          value={displayValue}
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            const next = event.target.value;
            onChange(/^\d{1,3}(,\d{3})+$/.test(next.trim()) ? next.replaceAll(",", "").trim() : next);
          }}
          onBlur={() => {
            setFocused(false);
            onBlur();
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText id={unitId}>{numberSpec(field).unit}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

function LoadState({ failed, fetching, retry }: { failed: boolean; fetching: boolean; retry(): void }) {
  if (failed) {
    return (
      <div>
        <Button variant="outline" size="sm" disabled={fetching} onClick={retry}>
          Retry loading token limits
        </Button>
      </div>
    );
  }
  return (
    <div role="status" aria-label="Loading token limits" className="grid gap-4 @2xl/token-limits:grid-cols-2">
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
      <Skeleton className="h-20 @2xl/token-limits:col-span-2" />
    </div>
  );
}
