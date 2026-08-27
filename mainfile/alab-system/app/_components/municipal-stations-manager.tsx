'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useState } from "react";

type Station = { id: string; stationName: string; latitude: number; longitude: number; status: "ACTIVE" | "INACTIVE" };

export function MunicipalStationsManager() {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationName, setStationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await fetch("/api/municipal-bfp/stations", { cache: "no-store" });
    const result = await response.json() as { stations?: Station[]; error?: string };
    if (!response.ok) setError(result.error ?? "Unable to load stations.");
    else setStations(result.stations ?? []);
  };

  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    const response = await fetch("/api/municipal-bfp/stations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationName, latitude, longitude }) });
    const result = await response.json() as { error?: string };
    setSaving(false);
    if (!response.ok) { setError(result.error ?? "Unable to add station."); return; }
    setStationName(""); setLatitude(""); setLongitude(""); void load();
  };

  const deactivate = async (id: string) => {
    setError("");
    const response = await fetch(`/api/municipal-bfp/stations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deactivate" }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error ?? "Unable to deactivate station."); return; }
    void load();
  };

  return <section className="mbfp-page"><div className="mbfp-page-header"><h1><i className="fa-solid fa-building-shield" /> Stations</h1><p>Create your municipal BFP stations before assigning personnel accounts.</p></div>
    <form className="mbfp-manager-form" onSubmit={submit}><input required value={stationName} onChange={(e) => setStationName(e.target.value)} placeholder="Station name" /><input required type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" /><input required type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" /><button disabled={saving}>{saving ? "Saving…" : "Add station"}</button></form>
    {error && <p className="mbfp-manager-error">{error}</p>}
    <div className="mbfp-manager-table"><table><thead><tr><th>Station</th><th>Coordinates</th><th>Status</th><th /></tr></thead><tbody>{stations.map((station) => <tr key={station.id}><td>{station.stationName}</td><td>{station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}</td><td>{station.status}</td><td>{station.status === "ACTIVE" && <button onClick={() => void deactivate(station.id)}>Deactivate</button>}</td></tr>)}{stations.length === 0 && <tr><td colSpan={4}>No stations created yet.</td></tr>}</tbody></table></div>
    <style>{`.mbfp-manager-form{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:.6rem;margin:1rem 0}.mbfp-manager-form input,.mbfp-manager-form button,.mbfp-manager-table button{padding:.65rem .75rem;border-radius:8px;border:1px solid #cbd5e1;font:inherit}.mbfp-manager-form button{background:#b91c1c;color:white;border:0;font-weight:700}.mbfp-manager-table{overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px}.mbfp-manager-table table{width:100%;border-collapse:collapse}.mbfp-manager-table th,.mbfp-manager-table td{padding:.8rem;text-align:left;border-bottom:1px solid #e2e8f0}.mbfp-manager-error{color:#b91c1c;font-weight:700}@media(max-width:720px){.mbfp-manager-form{grid-template-columns:1fr}.mbfp-page{padding:1rem}}`}</style>
  </section>;
}
