"use client";

import { reportDetailStyles, reportDetailMarkup } from "../../../_content/resident-report-detail-content";

export default function ReportDetailPage() {
  return (
    <>
      <style>{reportDetailStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: reportDetailMarkup }} />
    </>
  );
}
