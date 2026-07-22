"use client";

import { useEffect } from "react";
import { recordAnalyticsVisit } from "@/lib/api";

export function AnalyticsVisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem("sentinel-visit-recorded")) return;
    sessionStorage.setItem("sentinel-visit-recorded", "1");
    void recordAnalyticsVisit().catch(() => undefined);
  }, []);
  return null;
}
