"use client";

import { guideStyles, guideMarkup } from "../../_content/resident-guide-content";

export default function GuidePage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: "<style>" + guideStyles + "</style>" + guideMarkup }} />
  );
}
