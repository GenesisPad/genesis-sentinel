import type { Metadata } from "next";
import { AdminApiKeys } from "@/components/admin-api-keys";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminPage() {
  return <AdminApiKeys />;
}
