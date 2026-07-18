import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-[#d0d5dd] bg-white px-3 text-sm text-[#101828] outline-none transition-shadow placeholder:text-[#667085] focus:border-[#006d5b] focus:ring-2 focus:ring-[#006d5b]/20",
        className
      )}
      {...props}
    />
  );
}
