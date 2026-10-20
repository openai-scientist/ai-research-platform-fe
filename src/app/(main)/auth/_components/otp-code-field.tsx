"use client";

import { useEffect, useRef } from "react";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

import { Field, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function OtpCodeField<T extends FieldValues>({
  control,
  name,
  disabled,
}: {
  control: Control<T>;
  name: Path<T>;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
          <FieldLabel htmlFor="auth-code">Verification code</FieldLabel>
          <InputOTP
            {...field}
            ref={(input) => {
              field.ref(input);
              inputRef.current = input;
            }}
            id="auth-code"
            value={field.value ?? ""}
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            autoComplete="one-time-code"
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="size-11 text-lg sm:size-12"
                  aria-invalid={fieldState.invalid}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Field>
      )}
    />
  );
}
