"use client";

import { type ReactNode, useState } from "react";

import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SettingValues } from "@/lib/api/services/fetch-project-settings";

import { settingsFormValues, useProjectSettings } from "./settings-api";
import { SaveBar, SettingsHeading, SettingsRow, useUnsavedWarning } from "./settings-panel";

/** Form edits remain local until the server acknowledges the save. */
export function useDraft<T extends Record<string, unknown>>(id: string, initial: T) {
  const settings = useProjectSettings();
  const section = settings.snapshot.sections[id as keyof typeof settings.snapshot.sections];
  const [saved, setSaved] = useState(() => ({ ...initial, ...settingsFormValues(id, section ?? {}) }) as T);
  const [values, setValues] = useState(saved);
  const [version, setVersion] = useState(settings.snapshot.version);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  useUnsavedWarning(dirty);
  const set =
    <K extends keyof T>(key: K) =>
    (value: T[K]) =>
      setValues((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const changed = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(saved[key])),
    ) as SettingValues;
    if (!Object.keys(changed).length) return true;
    const result = await settings.save(id, changed, version);
    if (!result) return false;
    if ("conflictVersion" in result) {
      setVersion(result.conflictVersion);
      return false;
    }
    const canonical = { ...values, ...result.values } as T;
    setSaved(canonical);
    setValues(canonical);
    setVersion(result.version);
    return true;
  };
  return {
    values,
    set,
    dirty,
    save,
    discard: () => {
      const canonical = { ...initial, ...settingsFormValues(id, section ?? {}) } as T;
      setSaved(canonical);
      setValues(canonical);
      setVersion(settings.snapshot.version);
    },
  };
}

/** A form that saves one backend settings section. */
export function DraftTab({
  id,
  title,
  what,
  dirty,
  onDiscard,
  onSave,
  validate,
  action,
  children,
  hideHeading = false,
}: {
  id: string;
  title: string;
  /** Names the settings in the save feedback. */
  what: string;
  dirty: boolean;
  onDiscard: () => void;
  onSave: () => Promise<boolean>;
  /** Returns an error to show, or nothing when the values are fine. */
  validate?: () => string | undefined;
  action?: ReactNode;
  children: ReactNode;
  hideHeading?: boolean;
}) {
  const settings = useProjectSettings();
  const inactive = Object.entries(settings.snapshot.capabilities).some(
    ([key, capability]) => key.startsWith(`${id}.`) && !capability.supported,
  );
  return (
    <div className="flex flex-col gap-6">
      {!hideHeading && <SettingsHeading title={title} action={action} />}
      {inactive && (
        <p className="text-muted-foreground text-xs">
          {id === "access"
            ? "Invitation expiry is applied, up to the platform maximum. Other access preferences are saved but not enforced yet."
            : "These preferences are saved to your project but are not applied by the research engine yet."}
        </p>
      )}
      <form
        id={`settings-${id}`}
        aria-label={title}
        noValidate
        className="flex flex-col gap-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const problem = validate?.();
          if (problem) return void toast.error(problem);
          if (await onSave()) toast.success("Settings saved", { description: what });
        }}
      >
        <fieldset disabled={settings.pending} className="flex min-w-0 flex-col gap-6">
          {children}
        </fieldset>
      </form>
      <SaveBar dirty={dirty} pending={settings.pending} form={`settings-${id}`} onDiscard={onDiscard} />
    </div>
  );
}

export type Option = { value: string; label: string; disabled?: boolean };

export function ChoiceRow({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  disabled,
  wide,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <SettingsRow label={label} htmlFor={id} hint={hint}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className={wide ? "w-full max-w-80" : "w-full max-w-56"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </SettingsRow>
  );
}

export function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <SettingsRow label={label} htmlFor={id} hint={hint} inline>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </SettingsRow>
  );
}

export function TextRow({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <SettingsRow label={label} htmlFor={id} hint={hint}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
    </SettingsRow>
  );
}

/** A number with a unit after it, such as "3 runs" or "60 minutes". */
export function NumberRow({
  id,
  label,
  hint,
  value,
  onChange,
  unit,
  prefix,
  disabled,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  prefix?: string;
  disabled?: boolean;
}) {
  return (
    <SettingsRow label={label} htmlFor={id} hint={hint}>
      <div className="flex items-center gap-2.5">
        <div className="relative w-full sm:w-32">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground text-sm">
              {prefix}
            </span>
          )}
          <Input
            id={id}
            inputMode="decimal"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
            className={prefix ? "pl-6 tabular-nums" : "tabular-nums"}
          />
        </div>
        {unit && <span className="shrink-0 text-muted-foreground text-sm">{unit}</span>}
      </div>
    </SettingsRow>
  );
}

/** A service the project can be linked to, with what it does and the button that links it. */
export function ServiceRow({
  name,
  description,
  icon: Icon,
  action,
}: {
  name: string;
  description: string;
  icon: LucideIcon;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 px-4 py-5 sm:px-5">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg border bg-muted/50">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="flex min-w-32 flex-1 flex-col gap-0.5">
        <p className="wrap-anywhere font-medium text-sm">{name}</p>
        <p className="text-pretty text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
