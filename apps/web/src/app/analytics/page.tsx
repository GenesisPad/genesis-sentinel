import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Live, evidence-backed statistics from Genesis Sentinel token scans."
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
