"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Summary = { id: string; reference: string; status: string; submittedAt: string; correctionReason: string | null; firstName: string; lastName: string; email: string; phone: string; barangay: string; address: string };
type Detail = Summary & { username: string; municipality: string; evidence: { frontUrl: string | null; backUrl: string | null; selfieUrl: string | null }; events: { type: string; notes: string | null; createdAt: string }[] };

export default function VerificationQueuePage() {
  const [applications, setApplications] = useState<Summary[]>([]);
  const [municipality, setMunicipality] = useState("");
  const [filter, setFilter] = useState("PENDING");
  const [selected, setSelected] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [correctionMode, setCorrectionMode] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/municipal-bfp/resident-applications", { cache: "no-store" });
    const result = await response.json() as { applications?: Summary[]; municipality?: string; error?: string };
    setLoading(false);
    if (!response.ok) { setError(result.error ?? "Unable to load resident applications."); return; }
    setApplications(result.applications ?? []); setMunicipality(result.municipality ?? ""); setError("");
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => filter === "ALL" ? applications : applications.filter((item) => item.status === filter), [applications, filter]);
  const pendingCount = applications.filter((item) => item.status === "PENDING").length;
  const correctionsCount = applications.filter((item) => item.status === "CHANGES_REQUESTED").length;

  async function openApplication(id: string) {
    setWorking(true); setError("");
    const response = await fetch(`/api/municipal-bfp/resident-applications/${id}`, { cache: "no-store" });
    const result = await response.json() as { application?: Detail; error?: string };
    setWorking(false);
    if (!response.ok || !result.application) { setError(result.error ?? "Unable to open this application."); return; }
    setSelected(result.application); setReason(""); setCorrectionMode(false);
  }

  async function decide(action: "approve" | "request-corrections") {
    if (!selected) return;
    setWorking(true); setError("");
    const response = await fetch(`/api/municipal-bfp/resident-applications/${selected.id}/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: action === "request-corrections" ? JSON.stringify({ reason }) : undefined,
    });
    const result = await response.json() as { error?: string };
    setWorking(false);
    if (!response.ok) { setError(result.error ?? "Unable to save this review."); return; }
    setSelected(null); setCorrectionMode(false); await load();
  }

  return <main className="resident-review">
    <style>{styles}</style>
    <header className="review-heading">
      <div><span className="section-label">Identity & residency control</span><h1>Resident Applications</h1><p>Review protected identity evidence before residents receive emergency-reporting access in {municipality || "your municipality"}.</p></div>
      <button className="refresh" onClick={() => void load()} disabled={loading}>↻ {loading ? "Checking…" : "Refresh"}</button>
    </header>
    <section className="review-metrics" aria-label="Application totals">
      <div><strong>{pendingCount}</strong><span>Awaiting review</span></div><div><strong>{correctionsCount}</strong><span>Corrections requested</span></div><div><strong>{applications.filter((item) => item.status === "VERIFIED").length}</strong><span>Approved</span></div>
    </section>
    <nav className="review-filters" aria-label="Application filters">
      {[['PENDING','Under review'],['CHANGES_REQUESTED','Needs correction'],['VERIFIED','Approved'],['ALL','All']].map(([value,label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}
    </nav>
    {error && <p className="review-error" role="alert">{error}</p>}
    <section className="application-list">
      {!loading && !visible.length && <div className="empty"><span>✓</span><h2>No applications in this view</h2><p>New resident submissions assigned to {municipality || "this municipality"} will appear here.</p></div>}
      {visible.map((item) => <article className="application-row" key={item.id}>
        <div className="resident-avatar">{item.firstName[0]}{item.lastName[0]}</div>
        <div className="resident-main"><span className={`status ${item.status.toLowerCase()}`}>{item.status === "PENDING" ? "Under review" : item.status === "CHANGES_REQUESTED" ? "Changes requested" : "Approved"}</span><h2>{item.firstName} {item.lastName}</h2><p>{item.reference} · {item.barangay}</p></div>
        <div className="resident-contact"><small>Contact</small><strong>{item.phone}</strong><span>{item.email}</span></div>
        <time dateTime={item.submittedAt}>{new Date(item.submittedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</time>
        <button className="review-button" onClick={() => void openApplication(item.id)}>Review application →</button>
      </article>)}
    </section>
    {working && <div className="review-working" aria-live="polite"><span />Securing review…</div>}
    {selected && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) setSelected(null); }}>
      <section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="application-title">
        <header><div><span className="section-label">{selected.reference}</span><h2 id="application-title">{selected.firstName} {selected.lastName}</h2><p>{selected.barangay}, {selected.municipality}</p></div><button className="close" aria-label="Close" onClick={() => setSelected(null)}>×</button></header>
        <div className="dialog-body">
          <section className="identity-facts"><div><small>Username</small><strong>{selected.username}</strong></div><div><small>Phone</small><strong>{selected.phone}</strong></div><div><small>Email</small><strong>{selected.email}</strong></div><div><small>Address</small><strong>{selected.address}</strong></div></section>
          <section className="evidence-section"><div className="evidence-title"><h3>Protected evidence</h3><span>Watermarked review copies · links expire in 10 minutes</span></div><div className="evidence-grid">
            <Evidence label="Valid ID — front" url={selected.evidence.frontUrl} /><Evidence label="Valid ID — back" url={selected.evidence.backUrl} /><Evidence label="Applicant selfie" url={selected.evidence.selfieUrl} />
          </div></section>
          {selected.events.length > 0 && <section className="history"><h3>Review history</h3>{selected.events.map((event, index) => <div key={`${event.type}-${index}`}><span /><p><strong>{event.type.replaceAll("_", " ")}</strong><small>{new Date(event.createdAt).toLocaleString("en-PH")}</small>{event.notes && <em>{event.notes}</em>}</p></div>)}</section>}
          {correctionMode && <label className="reason-field">What must the resident correct?<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} placeholder="Be specific—for example: Front ID is blurred; upload a clear image showing the full card." autoFocus /></label>}
          {error && <p className="review-error" role="alert">{error}</p>}
        </div>
        {selected.status === "PENDING" && <footer>{correctionMode ? <><button className="secondary" onClick={() => setCorrectionMode(false)}>Back</button><button className="danger" disabled={reason.trim().length < 10 || working} onClick={() => void decide("request-corrections")}>Send correction request</button></> : <><button className="secondary" onClick={() => setCorrectionMode(true)}>Request corrections</button><button className="approve" disabled={working} onClick={() => void decide("approve")}>Approve resident</button></>}</footer>}
      </section>
    </div>}
  </main>;
}

function Evidence({ label, url }: { label: string; url: string | null }) {
  return <figure className="evidence"><div>{url ? <img src={url} alt={`${label}, protected review copy`} /> : <span>Not provided</span>}</div><figcaption>{label}</figcaption></figure>;
}

const styles = `
*{box-sizing:border-box}.resident-review{padding:clamp(1rem,2.5vw,2.2rem);font-family:var(--font-plus-jakarta),Arial,sans-serif;color:#111827}.review-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;margin-bottom:1.5rem}.section-label{text-transform:uppercase;letter-spacing:.12em;font-size:.7rem;font-weight:900;color:#c52219}.review-heading h1{margin:.2rem 0;font-size:clamp(2rem,4vw,3.4rem);letter-spacing:-.055em}.review-heading p{max-width:720px;margin:.4rem 0 0;color:#657087;line-height:1.6}.refresh,.review-button,.close,.review-filters button,.review-dialog footer button{font:800 .82rem inherit;cursor:pointer}.refresh{padding:.72rem 1rem;border:1px solid #d8dee8;border-radius:10px;background:#fff}.review-metrics{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #e3e7ed;border-radius:16px;overflow:hidden;background:#fff}.review-metrics div{display:flex;align-items:baseline;gap:.7rem;padding:1.1rem 1.3rem;border-right:1px solid #e3e7ed}.review-metrics div:last-child{border:0}.review-metrics strong{font-size:1.7rem}.review-metrics span{color:#667085;font-weight:700;font-size:.82rem}.review-filters{display:flex;gap:.45rem;margin:1.2rem 0}.review-filters button{padding:.58rem .9rem;border:1px solid #dce1e8;border-radius:999px;background:#fff;color:#667085}.review-filters .active{border-color:#c52219;background:#c52219;color:#fff}.application-list{border:1px solid #e3e7ed;border-radius:18px;background:#fff;overflow:hidden}.application-row{display:grid;grid-template-columns:auto minmax(210px,1.4fr) minmax(210px,1fr) minmax(150px,.7fr) auto;align-items:center;gap:1rem;padding:1rem 1.2rem;border-bottom:1px solid #edf0f4}.application-row:last-child{border:0}.resident-avatar{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#fff1ef;color:#b91c1c;font-weight:900}.resident-main h2{margin:.25rem 0 .15rem;font-size:1rem}.resident-main p,.resident-contact span,.application-row time{margin:0;color:#718096;font-size:.78rem}.status{display:inline-flex;padding:.2rem .48rem;border-radius:99px;font-size:.65rem;font-weight:900;text-transform:uppercase}.status.pending{background:#fff7db;color:#9a5b00}.status.changes_requested{background:#fff0f0;color:#b42318}.status.verified{background:#e9fbf1;color:#087443}.resident-contact{display:grid;gap:.15rem}.resident-contact small{color:#98a2b3;text-transform:uppercase;font-weight:900;font-size:.63rem}.resident-contact strong{font-size:.83rem}.review-button{padding:.7rem .9rem;border:0;border-radius:10px;background:#111827;color:#fff;white-space:nowrap}.empty{padding:4rem 1rem;text-align:center}.empty span{display:grid;place-items:center;margin:auto;width:48px;height:48px;border-radius:15px;background:#e9fbf1;color:#087443;font-size:1.3rem}.empty h2{margin:1rem 0 .25rem}.empty p{color:#718096}.review-error{padding:.8rem 1rem;border-left:4px solid #dc2626;background:#fff1f2;color:#991b1b;font-weight:750}.dialog-backdrop{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.58);backdrop-filter:blur(6px)}.review-dialog{width:min(1040px,100%);max-height:92dvh;display:flex;flex-direction:column;border-radius:22px;background:#fff;box-shadow:0 32px 90px rgba(15,23,42,.35);overflow:hidden}.review-dialog>header{display:flex;justify-content:space-between;padding:1.25rem 1.4rem;border-bottom:1px solid #e8ebf0}.review-dialog h2{margin:.25rem 0 0;font-size:1.6rem}.review-dialog header p{margin:.25rem 0 0;color:#718096}.close{width:42px;height:42px;border:1px solid #dce1e8;border-radius:12px;background:#fff;font-size:1.4rem}.dialog-body{padding:1.3rem;overflow:auto}.identity-facts{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e2e7ee;border-radius:14px;overflow:hidden}.identity-facts div{padding:1rem;border-right:1px solid #e2e7ee}.identity-facts div:last-child{border:0}.identity-facts small{display:block;color:#718096;font-size:.66rem;font-weight:900;text-transform:uppercase;margin-bottom:.3rem}.identity-facts strong{font-size:.83rem;overflow-wrap:anywhere}.evidence-section{margin-top:1.4rem}.evidence-title{display:flex;justify-content:space-between;align-items:baseline}.evidence-title h3,.history h3{margin:0}.evidence-title span{color:#718096;font-size:.72rem}.evidence-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-top:.8rem}.evidence{margin:0}.evidence>div{aspect-ratio:4/3;border-radius:12px;display:grid;place-items:center;overflow:hidden;background:#f2f4f7;border:1px solid #e1e6ec;color:#8b95a5}.evidence img{width:100%;height:100%;object-fit:contain}.evidence figcaption{padding:.5rem 0;font-size:.75rem;font-weight:800}.history{margin-top:1.4rem;padding-top:1.2rem;border-top:1px solid #e6e9ef}.history>div{display:flex;gap:.7rem;margin-top:.8rem}.history>div>span{width:9px;height:9px;margin-top:.35rem;border-radius:50%;background:#c52219}.history p{display:grid;margin:0}.history small{color:#718096}.history em{font-style:normal;color:#991b1b;margin-top:.2rem}.reason-field{display:grid;gap:.5rem;margin-top:1.2rem;font-weight:850}.reason-field textarea{min-height:110px;padding:.8rem;border:1px solid #cbd5e1;border-radius:12px;font:inherit;resize:vertical}.review-dialog footer{display:flex;justify-content:flex-end;gap:.7rem;padding:1rem 1.3rem;border-top:1px solid #e8ebf0}.review-dialog footer button{padding:.8rem 1.05rem;border-radius:10px}.secondary{border:1px solid #cbd5e1;background:#fff}.danger{border:0;background:#b91c1c;color:#fff}.approve{border:0;background:#138653;color:#fff}.review-working{position:fixed;right:1.2rem;bottom:1.2rem;z-index:2200;padding:.8rem 1rem;border-radius:12px;background:#111827;color:#fff;font-weight:800;box-shadow:0 12px 30px rgba(15,23,42,.3)}.review-working span{display:inline-block;width:12px;height:12px;margin-right:.5rem;border:2px solid #64748b;border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1000px){.application-row{grid-template-columns:auto 1fr auto}.resident-contact,.application-row time{display:none}.identity-facts{grid-template-columns:1fr 1fr}.identity-facts div:nth-child(2){border-right:0}.identity-facts div{border-bottom:1px solid #e2e7ee}.evidence-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.resident-review{padding:1rem}.review-heading{align-items:flex-start;flex-direction:column;gap:.8rem}.review-metrics{grid-template-columns:1fr}.review-metrics div{border-right:0;border-bottom:1px solid #e3e7ed}.review-filters{overflow:auto}.application-row{grid-template-columns:auto 1fr}.review-button{grid-column:1/-1;width:100%}.identity-facts,.evidence-grid{grid-template-columns:1fr}.identity-facts div{border-right:0}.evidence-title{align-items:flex-start;flex-direction:column;gap:.25rem}}
`;
