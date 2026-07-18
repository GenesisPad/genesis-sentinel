"use client";
import { useQuery } from "@tanstack/react-query";
import { getRecentScans } from "@/lib/api";
import type { RecentScan } from "@/lib/types";

export function useRecentScans() {
  return useQuery<RecentScan[]>({
    queryKey: ["recent-scans"],
    queryFn: getRecentScans,
    staleTime: 30_000,
  });
}
