"use client";

import { useEffect, useState } from "react";
import { MunicipalIncidentDetail } from "../../_components/municipal-incident-detail";

export default function GisMapPage() {
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading the current incident map…");
  useEffect(() => {
    fetch("/api/municipal-bfp/incidents", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!data.incidents?.length) { setMessage("There are no active incidents to show on the map."); return; } setIncidentId(data.incidents[0].id); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load the incident map."));
  }, []);
  return incidentId ? <MunicipalIncidentDetail incidentId={incidentId} /> : <main style={{ padding: "1.25rem" }}>{message}</main>;
}
