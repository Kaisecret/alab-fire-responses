"use client";

import React, { Suspense } from "react";
import { ResidentGuidePage } from "@/app/_components/resident-guide-page";

export default function GuidePage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading Emergency Guides...</div>}>
      <ResidentGuidePage />
    </Suspense>
  );
}
