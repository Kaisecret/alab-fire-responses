"use client";

import React, { Suspense } from "react";
import { ResidentGuidePage } from "@/app/_components/resident-guide-page";
import { NlpEmergencyTranslator } from "@/app/_components/nlp-emergency-translator";

export default function GuidePage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading Emergency Guides...</div>}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.2rem 1.25rem 0" }}>
        <NlpEmergencyTranslator defaultOpen={false} />
      </div>
      <ResidentGuidePage />
    </Suspense>
  );
}

