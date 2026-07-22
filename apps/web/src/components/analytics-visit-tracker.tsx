"use client";

import { useEffect } from "react";
import { recordAnalyticsVisit } from "@/lib/api";

export function AnalyticsVisitTracker() {
  useEffect(() => {
    const storageKey = "sentinel-analytics-visit-v2";
    if (sessionStorage.getItem(storageKey)) return;
    void recordAnalyticsVisit()
      .then(() => sessionStorage.setItem(storageKey, "1"))
      .catch(() => undefined);
  }, []);
  return null;
}
