'use client';

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Municipality = { id: string; name: string; psgcCode: string | null };
type Account = { userId: string; email: string; displayName: string; rankOrPosition: string | null; municipalityId: string; municipalityName: string; assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF"; status: string; mustChangePassword: boolean };
type FormState = { municipalityId: string; displayName: string; email: string; rankOrPosition: string; assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF"; temporaryPassword: string };

const initialForm: FormState = { municipalityId: "", displayName: "", email: "", rankOrPosition: "", assignmentRole: "MUNICIPAL_ADMIN", temporaryPassword: "" };

export function ProvincialMunicipalAccounts() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ municipalityName: string; email: string; temporaryPassword: string } | null>(null);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/provincial-bfp/municipal-accounts", { cache: "no-store" });
      const result = await response.json() as { municipalities?: Municipality[]; accounts?: Account[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load municipal accounts.");
      setMunicipalities(result.municipalities ?? []); setAccounts(result.accounts ?? []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load municipal accounts."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/provincial-bfp/municipal-accounts", { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { municipalities?: Municipality[]; accounts?: Account[]; error?: string } }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) throw new Error(result.error || "Unable to load municipal accounts.");
        setMunicipalities(result.municipalities ?? []); setAccounts(result.accounts ?? []);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load municipal accounts."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredMunicipalities = useMemo(() => municipalities.filter((municipality) => municipality.name.toLowerCase().includes(query.toLowerCase())), [municipalities, query]);
  const activeFor = (municipalityId: string) => accounts.filter((account) => account.municipalityId === municipalityId && account.status === "ACTIVE");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/provincial-bfp/municipal-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json() as { account?: { municipalityName: string; email: string }; temporaryPassword?: string; error?: string };
      if (!response.ok || !result.account || !result.temporaryPassword) throw new Error(result.error || "Unable to issue the account.");
      setIssued({ municipalityName: result.account.municipalityName, email: result.account.email, temporaryPassword: result.temporaryPassword });
      setForm(initialForm); setOpen(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to issue the account."); }
    finally { setSaving(false); }
  }

  return <main className="pma-shell"><style>{`
    .pma-shell{min-height:100vh;padding:clamp(1rem,4vw,3.5rem);background:#f7f8fb;color:#172033;font-family:Arial,sans-serif}.pma-wrap{max-width:1120px;margin:auto}.pma-top{display:flex;justify-content:space-between;gap:1rem;align-items:start}.pma-kicker{color:#b42318;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.76rem}.pma-title{margin:.35rem 0;font-size:clamp(1.8rem,4vw,2.7rem)}.pma-sub{margin:0;color:#5d6878;max-width:44rem;line-height:1.5}.pma-actions{display:flex;gap:.7rem;align-items:center}.pma-button{border:0;background:#db1b0d;color:#fff;padding:.78rem 1rem;border-radius:.65rem;font-weight:800;cursor:pointer;text-decoration:none;font-size:.92rem}.pma-button.secondary{background:#fff;color:#b42318;border:1px solid #fecaca}.pma-card{margin-top:1.5rem;background:#fff;border:1px solid #e7eaf0;border-radius:1rem;overflow:hidden;box-shadow:0 14px 36px rgba(20,32,51,.06)}.pma-toolbar{padding:1rem;display:flex;justify-content:space-between;gap:1rem;align-items:center;border-bottom:1px solid #e7eaf0}.pma-search{width:min(100%,18rem);padding:.68rem .8rem;border:1px solid #cfd7e4;border-radius:.6rem}.pma-table{width:100%;border-collapse:collapse}.pma-table th,.pma-table td{text-align:left;padding:.9rem 1rem;border-bottom:1px solid #eef1f5;font-size:.9rem}.pma-table th{background:#fcfcfd;color:#536276;font-size:.73rem;text-transform:uppercase;letter-spacing:.04em}.pma-badge{display:inline-block;padding:.25rem .5rem;border-radius:999px;background:#ecfdf3;color:#087443;font-size:.74rem;font-weight:800}.pma-badge.empty{background:#fff7ed;color:#b45309}.pma-muted{color:#6a7686}.pma-overlay{position:fixed;inset:0;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.52);z-index:20}.pma-dialog{width:min(100%,34rem);max-height:90vh;overflow:auto;background:#fff;border-radius:1rem;padding:1.35rem;box-shadow:0 24px 64px rgba(15,23,42,.28)}.pma-dialog h2{margin:0 0 .3rem}.pma-dialog p{color:#617083;line-height:1.45}.pma-form{display:grid;gap:.85rem;margin-top:1rem}.pma-form label{display:grid;gap:.35rem;font-size:.85rem;font-weight:800}.pma-form input,.pma-form select{padding:.7rem .75rem;border:1px solid #cad3df;border-radius:.55rem;font:inherit}.pma-form-actions{display:flex;justify-content:flex-end;gap:.6rem;margin-top:.4rem}.pma-alert{padding:.75rem .85rem;border-radius:.6rem;background:#fff1f1;color:#b42318;font-weight:700;font-size:.9rem}.pma-secret{padding:.9rem;background:#fff7ed;border:1px solid #fed7aa;border-radius:.65rem;font-family:ui-monospace,SFMono-Regular,monospace;font-size:1.05rem;word-break:break-all;color:#7c2d12}.pma-warning{font-weight:700;color:#9a3412}@media(max-width:680px){.pma-top,.pma-toolbar{align-items:stretch;flex-direction:column}.pma-actions{justify-content:space-between}.pma-table thead{display:none}.pma-table,.pma-table tbody,.pma-table tr,.pma-table td{display:block;width:100%}.pma-table tr{padding:.75rem 0;border-bottom:1px solid #eef1f5}.pma-table td{border:0;padding:.25rem 1rem}.pma-table td:first-child{font-weight:800}.pma-table td::before{content:attr(data-label);display:block;color:#718096;text-transform:uppercase;font-size:.67rem;font-weight:800;letter-spacing:.04em}}
  `}</style><div className="pma-wrap"><header className="pma-top"><div><span className="pma-kicker">Provincial BFP control</span><h1 className="pma-title">Municipal Accounts</h1><p className="pma-sub">Issue named accounts for every Antique municipal BFP office. Each staff member receives an individual temporary password and must set a personal password on first sign-in.</p></div><div className="pma-actions"><Link className="pma-button secondary" href="/provincial-bfp">Dashboard</Link><button className="pma-button" type="button" onClick={() => setOpen(true)}>+ Issue account</button></div></header>{error && <p className="pma-alert" role="alert">{error}</p>}<section className="pma-card"><div className="pma-toolbar"><strong>{municipalities.length || 18} Antique municipalities</strong><input className="pma-search" aria-label="Search municipalities" placeholder="Search municipality" value={query} onChange={(event) => setQuery(event.target.value)} /></div><table className="pma-table"><thead><tr><th>Municipality</th><th>PSGC</th><th>Account status</th><th>Assigned staff</th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Loading municipal accounts…</td></tr> : filteredMunicipalities.map((municipality) => { const active = activeFor(municipality.id); return <tr key={municipality.id}><td data-label="Municipality">{municipality.name}</td><td data-label="PSGC" className="pma-muted">{municipality.psgcCode ?? "—"}</td><td data-label="Status"><span className={`pma-badge ${active.length ? "" : "empty"}`}>{active.length ? "Provisioned" : "Not provisioned"}</span></td><td data-label="Assigned staff">{active.length ? active.map((account) => <div key={account.userId}>{account.displayName} <span className="pma-muted">· {account.assignmentRole === "MUNICIPAL_ADMIN" ? "Admin" : "Staff"}</span></div>) : <span className="pma-muted">No account issued</span>}</td></tr>; })}</tbody></table></section></div>{open && <div className="pma-overlay" role="dialog" aria-modal="true" aria-label="Issue municipal BFP account"><form className="pma-dialog pma-form" onSubmit={submit}><div><h2>Issue Municipal BFP account</h2><p>The temporary password is shown once after creation. Give it to the staff member through an approved private channel.</p></div><label>Municipality<select value={form.municipalityId} onChange={(event) => setForm({ ...form, municipalityId: event.target.value })} required><option value="">Select municipality</option>{municipalities.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}</select></label><label>Staff full name<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required /></label><label>Official email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Rank or position <input value={form.rankOrPosition} onChange={(event) => setForm({ ...form, rankOrPosition: event.target.value })} placeholder="Optional" /></label><label>Access role<select value={form.assignmentRole} onChange={(event) => setForm({ ...form, assignmentRole: event.target.value as FormState["assignmentRole"] })}><option value="MUNICIPAL_ADMIN">Municipal administrator</option><option value="MUNICIPAL_STAFF">Municipal staff</option></select></label><label>Temporary password <input type="password" minLength={12} value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} placeholder="Leave blank to generate securely" /></label><div className="pma-form-actions"><button className="pma-button secondary" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="pma-button" disabled={saving} type="submit">{saving ? "Issuing…" : "Issue account"}</button></div></form></div>}{issued && <div className="pma-overlay" role="dialog" aria-modal="true" aria-label="Temporary password"><section className="pma-dialog"><h2>Account issued</h2><p>{issued.email} can sign in for {issued.municipalityName}. Record this password now; it will not be shown again.</p><p className="pma-secret">{issued.temporaryPassword}</p><p className="pma-warning">The staff member must change this password on their first sign-in.</p><div className="pma-form-actions"><button className="pma-button" type="button" onClick={() => setIssued(null)}>I recorded it</button></div></section></div>}</main>;
}
