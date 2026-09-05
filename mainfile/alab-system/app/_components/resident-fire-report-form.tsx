"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Location = { latitude: number; longitude: number; accuracy: number; municipality: string; barangay: string };

const styles = `
  .report-form{max-width:900px;margin:0 auto 7rem;padding:1.25rem;color:#142033}.report-card{background:#fff;border:1px solid #f1d9d5;border-radius:24px;padding:clamp(1rem,3vw,2rem);box-shadow:0 14px 38px #5b1b0d12}.report-title{margin:0;font-size:clamp(1.65rem,4vw,2.45rem)}.report-lede{color:#667085;margin:.4rem 0 1.4rem}.emergency-banner{display:flex;gap:.8rem;align-items:center;background:#fff2f1;color:#a72019;border:1px solid #ffd0cb;border-radius:16px;padding:1rem;margin-bottom:1.25rem}.emergency-banner strong{display:block}.report-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.form-section{border:1px solid #e8ebf0;border-radius:16px;padding:1rem}.form-section h2{font-size:1rem;margin:0 0 .8rem;color:#8e1d17}.form-section label{display:block;font-size:.86rem;font-weight:700;margin:.7rem 0 .35rem}.form-section input,.form-section select,.form-section textarea{box-sizing:border-box;width:100%;border:1px solid #cfd7e4;border-radius:12px;padding:.8rem;background:#fff;color:#142033;font:inherit}.form-section textarea{min-height:110px;resize:vertical}.location-status{background:#f8fafc;border-radius:12px;padding:.85rem;font-size:.9rem;line-height:1.55}.location-status strong{color:#0f7a42}.location-status button,.photo-button{margin-top:.7rem;border:1px solid #d72a23;background:#fff;color:#b51d17;border-radius:10px;padding:.65rem .8rem;font-weight:800;cursor:pointer}.fire-types{display:grid;grid-template-columns:repeat(5,1fr);gap:.55rem}.fire-type{border:1px solid #e0e4eb;border-radius:14px;background:#fff;padding:.7rem .35rem;text-align:center;font-size:.75rem;font-weight:800;color:#53627a;cursor:pointer}.fire-type.active{border-color:#d92720;background:#fff5f4;color:#c71f18;box-shadow:0 0 0 2px #ffd7d3}.photo-preview{display:block;width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-top:.7rem}.submit-report{margin-top:1.2rem;width:100%;border:0;border-radius:14px;background:#db1e17;color:white;padding:1rem;font-size:1rem;font-weight:900;box-shadow:0 10px 20px #dc1f1733;cursor:pointer}.submit-report:disabled{opacity:.6;cursor:not-allowed}.form-error{margin:.8rem 0 0;color:#bf1c16;font-weight:700}.muted{color:#667085;font-size:.82rem}@media(max-width:700px){.report-form{padding:.75rem}.report-card{border-radius:18px}.report-grid{grid-template-columns:1fr}.fire-types{grid-template-columns:repeat(3,1fr)}}
`;

export function ResidentFireReportForm() {
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [locating, setLocating] = useState(false);
  const [fireType, setFireType] = useState("HOUSE_BUILDING");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) return setError("This browser does not support location detection.");
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude, accuracy } = position.coords;
        const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        const address = data.address ?? {};
        const municipality = address.municipality || address.city || address.town || "";
        const barangay = address.village || address.suburb || address.neighbourhood || "";
        if (!municipality || !barangay) throw new Error("Your barangay and municipality could not be detected. Try again outdoors.");
        setLocation({ latitude, longitude, accuracy, municipality, barangay });
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to determine the local address."); }
      finally { setLocating(false); }
    }, () => { setLocating(false); setError("Allow location access and try again so BFP can find the incident."); }, { enableHighAccuracy:true, timeout:15000, maximumAge:0 });
  };

  useEffect(() => { const timer = window.setTimeout(detectLocation, 0); return () => window.clearTimeout(timer); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!location) return setError("Current GPS location, municipality, and barangay are required.");

    // Client-side rate limit check: max 2 reports per 5 minutes
    try {
      const now = Date.now();
      const raw = localStorage.getItem("alab_successful_sos_reports");
      const timestamps: number[] = raw ? JSON.parse(raw) : [];
      const recent = timestamps.filter((t) => typeof t === "number" && t > now - 5 * 60 * 1000);
      if (recent.length >= 2) {
        return setError("You can only send up to 2 fire reports every 5 minutes. Please wait before submitting again.");
      }
    } catch {}

    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    form.set("fireType", fireType); form.set("latitude", String(location.latitude)); form.set("longitude", String(location.longitude));
    form.set("locationAccuracy", String(location.accuracy)); form.set("municipality", location.municipality); form.set("barangay", location.barangay);
    if (photo) form.set("photo", photo);
    try {
      const response = await fetch("/api/resident/fire-reports", { method:"POST", body:form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit the fire report.");
      // Record success only!
      try {
        const now = Date.now();
        const raw = localStorage.getItem("alab_successful_sos_reports");
        const timestamps: number[] = raw ? JSON.parse(raw) : [];
        const recent = timestamps.filter((t) => typeof t === "number" && t > now - 5 * 60 * 1000);
        recent.push(now);
        localStorage.setItem("alab_successful_sos_reports", JSON.stringify(recent));
      } catch {}
      router.push(`/resident/reports/${data.report.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to submit the fire report."); }
    finally { setSubmitting(false); }
  }

  return <><style>{styles}</style><main className="report-form"><section className="report-card"><h1 className="report-title">Report a Fire Incident</h1><p className="report-lede">Share the essential details so your Municipal BFP can respond quickly.</p><div className="emergency-banner"><span aria-hidden>🔥</span><div><strong>Fire Emergency</strong><span>Move to a safe location before sending this report.</span></div></div><form onSubmit={submit}><div className="report-grid"><section className="form-section"><h2>1. Current location</h2><div className="location-status">{location ? <><strong>GPS detected</strong><br />{location.barangay}, {location.municipality}, Antique<br /><span className="muted">Accuracy: {Math.round(location.accuracy)} m · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span></> : <><strong>{locating ? "Detecting your GPS…" : "Location needed"}</strong><br /><span className="muted">Turn on device location for an accurate response.</span></>}<br /><button type="button" onClick={detectLocation}>{locating ? "Detecting…" : "Detect my location"}</button></div><label htmlFor="landmark">Nearest landmark</label><input id="landmark" name="landmark" maxLength={180} placeholder="e.g. near the barangay hall" /></section><section className="form-section"><h2>2. What is burning?</h2><div className="fire-types">{[["HOUSE_BUILDING","House / Building"],["GRASS","Grass"],["FOREST","Forest"],["VEHICLE","Vehicle"],["OTHER","Other"]].map(([value,label]) => <button key={value} type="button" className={`fire-type ${fireType===value?"active":""}`} onClick={() => setFireType(value)}>{label}</button>)}</div><label htmlFor="description">Short description</label><textarea id="description" name="description" maxLength={1200} placeholder="Tell BFP what is happening. Do not put yourself in danger." /><label htmlFor="photo">Fire photo (optional)</label><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event)=>setPhoto(event.currentTarget.files?.[0] ?? null)} />{photo && <img className="photo-preview" src={URL.createObjectURL(photo)} alt="Selected incident" />}</section></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-report" disabled={submitting || locating} type="submit">{submitting ? "Sending report…" : "SEND FIRE ALERT"}</button></form></section></main></>;
}
