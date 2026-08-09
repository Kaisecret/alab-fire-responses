"use client";

import { reportsStyles, reportsMarkup } from "../../_content/resident-reports-content";

export default function ReportsPage() {
  return (
    <>
      <style>{reportsStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: reportsMarkup }} />
    </>
  );
}
