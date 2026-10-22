"use client";

import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface AuthTextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  id: string;
  label: string;
  type?: "text" | "email";
  autoComplete: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}
export function AuthTextField<T extends FieldValues>({
  control,
  name,
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  disabled,
  maxLength,
}: AuthTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className="gap-1.5" data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            value={typeof field.value === "string" ? field.value : ""}
            id={id}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            maxLength={maxLength}
            aria-invalid={fieldState.invalid}
          />
        </Field>
      )}
    />
  );
}
