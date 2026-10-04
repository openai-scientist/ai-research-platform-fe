"use client";

import { useId, useState } from "react";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContextRemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={label} title={label} onClick={onClick}>
      <Trash2 />
    </Button>
  );
}

import { ContextItemList, contextItemSummary } from "./context-item-list";

// Keep existing structured values intact; edit leaves without converting their types.
export function ContextDetailFields({
  value,
  onChange,
  label,
  placeholder,
  onRemove,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  placeholder?: string;
  onRemove?: () => void;
}) {
  const id = useId();
  const [newName, setNewName] = useState("");
  const itemLabel =
    ({ Assumptions: "Assumption", "Key concepts": "Concept" } as Record<string, string>)[label] ?? label;
  if (Array.isArray(value))
    return (
      <ContextItemList
        label={itemLabel}
        items={value.map((item, index) => ({ id: String(index), summary: contextItemSummary(item) }))}
        onAdd={() => {
          onChange([...value, ""]);
          return String(value.length);
        }}
        onRemove={(id) => onChange(value.filter((_, index) => String(index) !== id))}
      >
        {(id) => (
          <ContextDetailFields
            label={itemLabel}
            placeholder={placeholder}
            value={value[Number(id)]}
            onChange={(next) => onChange(value.map((item, index) => (String(index) === id ? next : item)))}
          />
        )}
      </ContextItemList>
    );
  if (value !== null && typeof value === "object")
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {Object.entries(value).map(([key, item]) => (
          <ContextDetailFields
            key={key}
            label={key.replaceAll("_", " ")}
            value={item}
            placeholder={placeholder}
            onChange={(next) => onChange({ ...value, [key]: next })}
            onRemove={() => onChange(Object.fromEntries(Object.entries(value).filter(([name]) => name !== key)))}
          />
        ))}
        <Field>
          <FieldLabel htmlFor={id}>Add a topic</FieldLabel>
          <div className="flex gap-2">
            <Input
              id={id}
              value={newName}
              placeholder={
                (
                  {
                    Constraints: "e.g. Time period or study population",
                    "Study design": "e.g. Method or comparison group",
                  } as Record<string, string>
                )[label] ?? "e.g. Data source or background"
              }
              onChange={(event) => setNewName(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const name = newName.trim();
                if (!name) {
                  toast.error("Enter a name for the detail.");
                  return;
                }
                if (Object.hasOwn(value, name)) {
                  toast.error("This detail already exists.");
                  return;
                }
                onChange({ ...value, [name]: "" });
                setNewName("");
              }}
            >
              Add
            </Button>
          </div>
        </Field>
      </div>
    );
  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {onRemove && <ContextRemoveButton label={`Remove ${label}`} onClick={onRemove} />}
      </div>
      {typeof value === "boolean" ? (
        <Checkbox id={id} checked={value} onCheckedChange={(checked) => onChange(checked === true)} />
      ) : null}
      {typeof value === "number" ? (
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(event) => {
            if (event.target.value !== "" && Number.isFinite(event.target.valueAsNumber))
              onChange(event.target.valueAsNumber);
          }}
        />
      ) : null}
      {typeof value !== "boolean" && typeof value !== "number" && (
        <Textarea
          id={id}
          placeholder={placeholder}
          value={value == null ? "" : String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}
