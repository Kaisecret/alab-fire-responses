'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ProvincialRequestError, requestProvincialJson } from "../../lib/provincial-bfp/client-request";
import { ProvincialAccountDialog } from "./provincial-account-dialog";

type Municipality = { id: string; name: string; psgcCode: string | null };
type Account = {
  userId: string;
  email: string;
  displayName: string;
  rankOrPosition: string | null;
  municipalityId: string;
  municipalityName: string;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF";
  status: string;
  mustChangePassword: boolean;
};
type FormState = {
  municipalityId: string;
  displayName: string;
  email: string;
  rankOrPosition: string;
  assignmentRole: "MUNICIPAL_ADMIN" | "MUNICIPAL_STAFF";
  temporaryPassword: string;
};

const initialForm: FormState = {
  municipalityId: "",
  displayName: "",
  email: "",
  rankOrPosition: "",
  assignmentRole: "MUNICIPAL_ADMIN",
  temporaryPassword: "",
};

const pageStyles = `
  .pma-container {
    padding: 1.5rem 1.75rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .pma-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .pma-header-title-area {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .pma-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #DB1B0D;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .pma-title {
    font-size: 1.45rem;
    font-weight: 800;
    color: #0F172A;
    margin: 0;
  }

  .pma-subtitle {
    font-size: 0.86rem;
    color: #64748B;
    max-width: 48rem;
    line-height: 1.5;
    margin: 0;
  }

  .pma-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pma-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.15rem;
    border-radius: 8px;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.18s;
    border: none;
    font-family: inherit;
  }

  .pma-btn-primary {
    background: #DB1B0D;
    color: #FFFFFF;
    box-shadow: 0 4px 12px rgba(219, 27, 13, 0.25);
  }

  .pma-btn-primary:hover {
    background: #c2160a;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(219, 27, 13, 0.35);
  }

  .pma-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }

  .pma-toolbar {
    padding: 1rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: #FAFAFA;
    border-bottom: 1px solid #E2E8F0;
  }

  .pma-toolbar-title {
    font-size: 0.9rem;
    font-weight: 800;
    color: #0F172A;
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .pma-search-input {
    width: min(100%, 260px);
    padding: 0.5rem 0.85rem;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    font-size: 0.82rem;
    outline: none;
    font-family: inherit;
  }

  .pma-search-input:focus {
    border-color: #DB1B0D;
  }

  .pma-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  .pma-table th {
    background: #F8FAFC;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.85rem 1.25rem;
    text-align: left;
    border-bottom: 1px solid #E2E8F0;
  }

  .pma-table td {
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid #F1F5F9;
    color: #334155;
    vertical-align: middle;
  }

  .pma-table tr:hover td {
    background: #F8FAFC;
  }

  .pma-muni-cell {
    font-weight: 700;
    color: #0F172A;
  }

  .pma-badge-status {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .pma-badge-status.active {
    background: #ECFDF5;
    color: #059669;
  }

  .pma-badge-status.empty {
    background: #FFF7ED;
    color: #C2410C;
  }

  .pma-staff-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    line-height: 1.4;
  }

  .pma-role-tag {
    font-size: 0.68rem;
    color: #64748B;
    background: #F1F5F9;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-weight: 600;
  }

  .pma-alert {
    padding: 0.85rem 1rem;
    border-radius: 8px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #B91C1C;
    font-weight: 600;
    font-size: 0.86rem;
  }

  /* ========== MODAL DIALOGS ========== */
  .pma-dialog::backdrop {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
  }

  .pma-dialog {
    width: min(calc(100vw - 2rem), 34rem);
    max-height: calc(100dvh - 2rem);
    margin: auto;
    overscroll-behavior: contain;
    overflow-y: auto;
    background: #FFFFFF;
    border-radius: 14px;
    padding: 1.75rem;
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.3);
    border: 1px solid #E2E8F0;
    animation: pmaSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes pmaFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes pmaSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .pma-dialog h2 {
    margin: 0 0 0.4rem;
    font-size: 1.25rem;
    font-weight: 800;
    color: #0F172A;
  }

  .pma-dialog p {
    color: #64748B;
    font-size: 0.84rem;
    line-height: 1.5;
    margin: 0;
  }

  .pma-form {
    display: grid;
    gap: 1rem;
    margin-top: 1.25rem;
  }

  .pma-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .pma-btn:focus-visible { outline: 3px solid #DB1B0D; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .pma-dialog { animation: none; } }

  .pma-form label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 700;
    color: #334155;
  }

  .pma-form input,
  .pma-form select {
    padding: 0.65rem 0.85rem;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 0.86rem;
    color: #0F172A;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  .pma-form input:focus,
  .pma-form select:focus {
    border-color: #DB1B0D;
    box-shadow: 0 0 0 3px rgba(219, 27, 13, 0.12);
  }

  .pma-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #F1F5F9;
  }

  .pma-btn-cancel {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    color: #475569;
  }

  .pma-btn-cancel:hover {
    background: #F8FAFC;
    color: #0F172A;
  }

  .pma-secret-box {
    padding: 1rem;
    background: #FFF7ED;
    border: 1px solid #FED7AA;
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 1.1rem;
    font-weight: 700;
    word-break: break-all;
    color: #9A3412;
    margin: 1rem 0;
    text-align: center;
    letter-spacing: 0.04em;
  }

  @media (max-width: 680px) {
    .pma-container {
      padding: 1rem;
      gap: 1rem;
    }

    .pma-header {
      flex-direction: column;
      align-items: stretch;
    }

    .pma-toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .pma-search-input {
      width: 100%;
    }
  }
`;

export function ProvincialMunicipalAccounts() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const submitting = useRef(false);
  const [issued, setIssued] = useState<{
    municipalityName: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);

  function refresh() {
    setLoading(true);
    setError("");
    setRevision(value => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    requestProvincialJson<{ municipalities: Municipality[]; accounts: Account[] }>(
      "/api/provincial-bfp/municipal-accounts", { signal: controller.signal },
    )
      .then(result => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(result.municipalities) || !Array.isArray(result.accounts)) {
          throw new Error("The account roster returned an invalid response. Please retry.");
        }
        setMunicipalities(result.municipalities);
        setAccounts(result.accounts);
        setLoaded(true);
        setError("");
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ProvincialRequestError && (reason.status === 401 || reason.status === 403)) {
          setMunicipalities([]);
          setAccounts([]);
          setLoaded(false);
        }
        setError(reason instanceof Error ? reason.message : "Unable to load municipal accounts.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  const filteredMunicipalities = useMemo(
    () =>
      municipalities.filter((municipality) =>
        municipality.name.toLowerCase().includes(query.toLowerCase())
      ),
    [municipalities, query]
  );

  const activeFor = (municipalityId: string) =>
    accounts.filter(
      (account) =>
        account.municipalityId === municipalityId && account.status === "ACTIVE"
    );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFormError("");
    try {
      const result = await requestProvincialJson<{
        account?: { municipalityName: string; email: string };
        temporaryPassword?: string;
      }>("/api/provincial-bfp/municipal-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!result.account || !result.temporaryPassword)
        throw new Error("The account response was incomplete. Refresh the roster before submitting again.");
      setIssued({
        municipalityName: result.account.municipalityName,
        email: result.account.email,
        temporaryPassword: result.temporaryPassword,
      });
      setForm(initialForm);
      setOpen(false);
      refresh();
    } catch (reason) {
      setFormError(
        reason instanceof Error
          ? reason.message
          : "Unable to issue the account."
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="pma-container">
      <style>{pageStyles}</style>

      {/* Header section */}
      <div className="pma-header">
        <div className="pma-header-title-area">
          <span className="pma-kicker">
            <i className="fa-solid fa-id-card-clip" /> Administration & Provisioning
          </span>
          <h1 className="pma-title">Municipal BFP Accounts</h1>
          <p className="pma-subtitle">
            Issue and manage official access accounts for all 18 Antique municipal BFP stations.
            Each municipal officer receives an individual temporary password and must set a personal
            password on first login.
          </p>
        </div>
        <div className="pma-actions">
          <button className="pma-btn pma-btn-cancel" type="button" onClick={refresh} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            className="pma-btn pma-btn-primary"
            type="button"
            disabled={!loaded || saving}
            onClick={() => { setFormError(""); setOpen(true); }}
          >
            <i className="fa-solid fa-user-plus" /> Issue New Account
          </button>
        </div>
      </div>

      {error && (
        <div className="pma-alert" role="alert">
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.4rem' }} />
          {error}
          <button className="pma-btn pma-btn-cancel" type="button" onClick={refresh} disabled={loading}>Retry</button>
        </div>
      )}

      {/* Table Card */}
      <div className="pma-card">
        <div className="pma-toolbar">
          <div className="pma-toolbar-title">
            <i className="fa-solid fa-city" style={{ color: '#DB1B0D' }} />
            <span>{loaded ? `${municipalities.length} Municipalities in Antique` : 'Municipalities in Antique'}</span>
          </div>
          <input
            className="pma-search-input"
            aria-label="Search municipalities"
            placeholder="Search municipality…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pma-table">
            <thead>
              <tr>
                <th>Municipality</th>
                <th>PSGC Code</th>
                <th>Account Status</th>
                <th>Assigned Municipal Personnel</th>
              </tr>
            </thead>
            <tbody>
              {loading && !loaded ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.5rem' }} />
                    Loading municipal account roster…
                  </td>
                </tr>
              ) : filteredMunicipalities.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  {error ? 'The account roster could not be loaded. Use Retry above.' : query ? 'No municipalities match your search.' : 'No municipalities are available.'}
                </td></tr>
              ) : (
                filteredMunicipalities.map((municipality) => {
                  const active = activeFor(municipality.id);
                  return (
                    <tr key={municipality.id}>
                      <td className="pma-muni-cell">{municipality.name}</td>
                      <td style={{ color: '#64748B', fontFamily: 'monospace' }}>
                        {municipality.psgcCode ?? "—"}
                      </td>
                      <td>
                        <span
                          className={`pma-badge-status ${
                            active.length ? "active" : "empty"
                          }`}
                        >
                          {active.length ? (
                            <>
                              <i className="fa-solid fa-circle-check" /> Provisioned
                            </>
                          ) : (
                            <>
                              <i className="fa-regular fa-clock" /> Not Provisioned
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        {active.length ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {active.map((account) => (
                              <div key={account.userId} className="pma-staff-row">
                                <strong>{account.displayName}</strong>
                                <span className="pma-role-tag">
                                  {account.assignmentRole === "MUNICIPAL_ADMIN"
                                    ? "Admin"
                                    : "Staff"}
                                </span>
                                {account.rankOrPosition && (
                                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                    ({account.rankOrPosition})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                            No active account issued
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Account Modal */}
      {open && (
        <ProvincialAccountDialog label="Issue municipal BFP account" onClose={() => setOpen(false)} dismissible={!saving}>
            <h2>
              <i className="fa-solid fa-shield-halved" style={{ color: '#DB1B0D', marginRight: '0.5rem' }} />
              Issue Municipal BFP Account
            </h2>
            <p>
              Provision a named administrative or staff login for a municipal fire station. The
              temporary password will only be displayed once upon submission.
            </p>

            <form className="pma-form" onSubmit={submit}>
              {formError && <div className="pma-alert" role="alert">{formError}</div>}
              <label>
                Target Municipality
                <select
                  value={form.municipalityId}
                  onChange={(event) =>
                    setForm({ ...form, municipalityId: event.target.value })
                  }
                  required
                >
                  <option value="">Select Antique Municipality</option>
                  {municipalities.map((municipality) => (
                    <option key={municipality.id} value={municipality.id}>
                      {municipality.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Official Staff Full Name
                <input
                  placeholder="e.g. SFO2 Ricardo Santos"
                  value={form.displayName}
                  onChange={(event) =>
                    setForm({ ...form, displayName: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                Official Email Address
                <input
                  type="email"
                  placeholder="e.g. sanjose.bfp@antique.gov.ph"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                Rank or Position (Optional)
                <input
                  value={form.rankOrPosition}
                  onChange={(event) =>
                    setForm({ ...form, rankOrPosition: event.target.value })
                  }
                  placeholder="e.g. Municipal Fire Marshal / Shift Commander"
                />
              </label>

              <label>
                Authorization Role
                <select
                  value={form.assignmentRole}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      assignmentRole: event.target
                        .value as FormState["assignmentRole"],
                    })
                  }
                >
                  <option value="MUNICIPAL_ADMIN">Municipal Administrator (Full Station Control)</option>
                  <option value="MUNICIPAL_STAFF">Municipal Staff (Operations & Dispatch)</option>
                </select>
              </label>

              <label>
                Temporary Password (Optional)
                <input
                  type="password"
                  minLength={12}
                  value={form.temporaryPassword}
                  onChange={(event) =>
                    setForm({ ...form, temporaryPassword: event.target.value })
                  }
                  placeholder="Leave blank to automatically generate securely"
                />
              </label>

              <div className="pma-form-actions">
                <button
                  className="pma-btn pma-btn-cancel"
                  type="button"
                  disabled={saving}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="pma-btn pma-btn-primary"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" /> Issuing Account…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check" /> Issue Account
                    </>
                  )}
                </button>
              </div>
            </form>
        </ProvincialAccountDialog>
      )}

      {/* Issued Password Notice Modal */}
      {issued && (
        <ProvincialAccountDialog label="Temporary password" onClose={() => setIssued(null)} dismissible={false}>
            <h2 style={{ color: '#059669' }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem' }} />
              Account Successfully Provisioned
            </h2>
            <p>
              Account for <strong>{issued.email}</strong> ({issued.municipalityName}) has been created.
              Record the generated temporary password below; it will not be displayed again.
            </p>

            <div className="pma-secret-box">{issued.temporaryPassword}</div>

            <p style={{ color: '#C2410C', fontWeight: 600, fontSize: '0.8rem' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.35rem' }} />
              The recipient must change this password immediately upon their first sign-in.
            </p>

            <div className="pma-form-actions">
              <button
                className="pma-btn pma-btn-primary"
                type="button"
                onClick={() => setIssued(null)}
              >
                I have securely recorded this password
              </button>
            </div>
        </ProvincialAccountDialog>
      )}
    </div>
  );
}
