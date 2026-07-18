import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  icon,
  className,
}: {
  title: string;
  body?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-border bg-surface-deep p-6 text-center", className)}>
      {icon ? <div className="mb-3 flex justify-center text-muted">{icon}</div> : null}
      <p className="font-semibold text-foreground">{title}</p>
      {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
    </div>
  );
}
