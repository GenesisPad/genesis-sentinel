import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeletons only where the content shape is known (identity + score + counts). */
export function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="grid gap-7 p-6 md:grid-cols-2">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-2.5 w-full rounded-md" />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card className="h-56 p-6"><Skeleton className="h-full w-full" /></Card>
        <Card className="h-56 p-6"><Skeleton className="h-full w-full" /></Card>
      </div>
    </div>
  );
}
