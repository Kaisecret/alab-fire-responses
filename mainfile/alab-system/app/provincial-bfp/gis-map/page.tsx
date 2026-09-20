"use client";

import dynamic from "next/dynamic";
import React from "react";

const ProvincialGisOperationsMap = dynamic(
  () => import("../../_components/provincial-gis-operations-map").then((mod) => mod.ProvincialGisOperationsMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          color: "#64748B",
          fontSize: "0.9rem",
          fontWeight: 700,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.6rem", color: "#DC2626" }} /> Loading Provincial GIS Operations Map…
      </div>
    ),
  }
);

export default function ProvincialGisMapPage() {
  return <ProvincialGisOperationsMap />;
}
