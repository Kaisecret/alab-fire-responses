import { Suspense } from "react";

import { MunicipalGisOperationsMap } from "../../_components/municipal-gis-operations-map";

export default function GisMapPage() {
  return <Suspense fallback={<div style={{ padding: "2rem", color: "#64748b" }}>Loading operations map…</div>}><MunicipalGisOperationsMap /></Suspense>;
}
