"use client";

import dynamic from "next/dynamic";
import React from "react";
import { SkeletonPage } from "../../_components/skeleton-loader";

const ProvincialGisOperationsMap = dynamic(
  () => import("../../_components/provincial-gis-operations-map").then((mod) => mod.ProvincialGisOperationsMap),
  {
    ssr: false,
    loading: () => <SkeletonPage variant="map" label="Loading the provincial GIS operations map" style={{ padding: '10px 1.5rem 2.5rem' }} />,
  }
);

export default function ProvincialGisMapPage() {
  return <ProvincialGisOperationsMap />;
}
