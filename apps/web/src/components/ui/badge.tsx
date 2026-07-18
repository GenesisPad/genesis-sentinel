import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
        className,
      )}
      style={style}
      {...props}
    />
  );
}
