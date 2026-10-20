"use client";

import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

import { PasswordInput } from "@/components/password-input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface AuthTextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  placeholder?: string;
  disabled?: boolean;
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
}: AuthTextFieldProps<T>) {
  const InputComponent = type === "password" ? PasswordInput : Input;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className="gap-1.5" data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <InputComponent
            {...field}
            value={typeof field.value === "string" ? field.value : ""}
            id={id}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
        </Field>
      )}
    />
  );
}
