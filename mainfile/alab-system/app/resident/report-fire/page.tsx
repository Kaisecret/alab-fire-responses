"use client";

import { reportFireMarkup, reportFireStyles } from "../../_content/resident-report-fire-content";

export default function ResidentReportFirePage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: "<style>" + reportFireStyles + "</style>" + reportFireMarkup }} />
  );
}
