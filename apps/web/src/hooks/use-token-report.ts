"use client";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createScan, getScan, getScanReport, getTokenReport, type ApiError } from "@/lib/api";
import type { ChainId } from "@/lib/chains";
import type { ScanJob, ScanReport } from "@/lib/types";

const TERMINAL = new Set(["completed", "partial", "failed"]);

export function useTokenReport(chainId: ChainId, address: string, initialData?: ScanReport) {
  const queryClient = useQueryClient();
  const [freshScanId, setFreshScanId] = useState<string | null>(null);
  const tokenQueryKey = useMemo(() => ["token", chainId, address.toLowerCase()] as const, [address, chainId]);

  const baseReport = useQuery<ScanReport, ApiError>({
    queryKey: tokenQueryKey,
    queryFn: () => getTokenReport(chainId, address),
    initialData,
    staleTime: 60_000,
    retry: (count, err) => err.code === "network_error" && count < 2,
  });

  const rerunMutation = useMutation({
    mutationFn: () => createScan({ address, chainId, fresh: true }),
    onSuccess: (job) => {
      setFreshScanId(job.scanId);
      queryClient.setQueryData(["scan", job.scanId], job);
    },
  });

  const freshJob = useQuery<ScanJob, ApiError>({
    queryKey: ["scan", freshScanId],
    queryFn: () => getScan(freshScanId as string),
    enabled: !!freshScanId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL.has(status)) return false;
      return 900;
    },
    retry: (count, err) => err.code === "network_error" && count < 3,
  });

  const freshTerminal = !!freshJob.data && TERMINAL.has(freshJob.data.status);
  const freshReport = useQuery<ScanReport, ApiError>({
    queryKey: ["scan-report", freshScanId],
    queryFn: () => getScanReport(freshScanId as string),
    enabled: !!freshScanId && freshTerminal && freshJob.data?.status !== "failed",
    staleTime: 0,
  });

  useEffect(() => {
    if (!freshReport.data) return;
    queryClient.setQueryData(tokenQueryKey, freshReport.data);
  }, [freshReport.data, queryClient, tokenQueryKey]);

  const isRerunning =
    rerunMutation.isPending ||
    (!!freshScanId && (!freshTerminal || (freshJob.data?.status !== "failed" && freshReport.isFetching)));

  return {
    ...baseReport,
    data: freshReport.data ?? baseReport.data,
    rerun: () => rerunMutation.mutate(),
    isRerunning,
    rerunError: rerunMutation.error ?? freshJob.error ?? freshReport.error ?? null,
    freshJob: freshJob.data,
  };
}
