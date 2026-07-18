import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full min-w-0 bg-transparent font-mono text-base text-foreground placeholder:text-faint focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
