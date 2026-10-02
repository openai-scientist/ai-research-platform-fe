"use client";

import { type ComponentProps, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export function PasswordInput({ className, ...props }: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className={className}>
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={props.disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={props.id}
          aria-pressed={visible}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? (
            <EyeOff aria-hidden="true" data-icon="inline-end" />
          ) : (
            <Eye aria-hidden="true" data-icon="inline-end" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
