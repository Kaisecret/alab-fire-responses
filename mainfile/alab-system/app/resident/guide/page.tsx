"use client";

import { guideStyles, guideMarkup } from "../../_content/resident-guide-content";

export default function GuidePage() {
  return (
    <>
      <style>{guideStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: guideMarkup }} />
    </>
  );
}
