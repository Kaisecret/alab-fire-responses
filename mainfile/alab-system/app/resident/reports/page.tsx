"use client";

import { reportsStyles, reportsMarkup } from "../../_content/resident-reports-content";

export default function ReportsPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: "<style>" + reportsStyles + "</style>" + reportsMarkup }} />
  );
}
