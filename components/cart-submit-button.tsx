"use client";

import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type CartSubmitButtonProps = ComponentProps<"button"> & {
  pendingLabel: string;
};

export function CartSubmitButton({
  children,
  className,
  disabled,
  pendingLabel,
  ...props
}: CartSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : children}
    </button>
  );
}
