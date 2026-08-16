"use client";

import { useParams } from "next/navigation";
import { ResidentReportStatus } from "../../../_components/resident-report-status";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  return <ResidentReportStatus reportId={params.id} />;
}
