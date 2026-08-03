"use client";

import { reportDetailStyles, reportDetailMarkup } from "../../../_content/resident-report-detail-content";

export default function ReportDetailPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: "<style>" + reportDetailStyles + "</style>" + reportDetailMarkup }} />
  );
}
