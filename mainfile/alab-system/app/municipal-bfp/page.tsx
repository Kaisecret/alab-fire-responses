import type { Metadata } from "next";

import { MunicipalBfpDashboard } from "../_components/municipal-bfp-dashboard";

export const metadata: Metadata = {
  title: "Municipal BFP Dashboard - ALAB",
  description: "Municipal BFP incident coordination and operational dashboard for ALAB.",
};

export default function MunicipalBfpDashboardPage() {
  return <MunicipalBfpDashboard />;
}
