import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("motion-safe:animate-pulse rounded-md bg-border/70", className)}
    />
  );
}
