"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MunicipalIdentity = {
  email: string;
  displayName: string;
  rankOrPosition: string | null;
  municipalityName: string;
  assignmentRole: string;
  mustChangePassword: boolean;
};

const styles = `
  .municipal-settings { max-width: 1120px; margin: 0 auto; padding: 24px; color: #172033; font-family: 'Plus Jakarta Sans', sans-serif; }
  .municipal-settings__head { margin-bottom: 16px; display: grid; gap: 6px; }
  .municipal-settings__eyebrow { color: #d91b10; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
  .municipal-settings h1 { margin: 0; font-size: clamp(28px, 4vw, 42px); line-height: 1; letter-spacing: -.04em; }
  .municipal-settings__head p { margin: 0; color: #64748b; font-size: 13px; }
  .municipal-settings__grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr); gap: 8px; }
  .municipal-settings__card { min-width: 0; border: 1px solid #dfe6ef; border-radius: 20px; background: #fff; box-shadow: 0 8px 28px rgba(15,23,42,.05); overflow: hidden; }
  .municipal-settings__profile { padding: 20px; display: grid; gap: 16px; }
  .municipal-settings__identity { display: flex; align-items: center; gap: 12px; }
  .municipal-settings__avatar { width: 58px; height: 58px; border-radius: 18px; display: grid; place-items: center; color: #fff; background: #d91b10; box-shadow: 0 10px 24px rgba(217,27,16,.22); font-size: 21px; }
  .municipal-settings__identity strong { display: block; font-size: 18px; }
  .municipal-settings__identity span { display: block; margin-top: 3px; color: #d91b10; font-size: 12px; font-weight: 800; }
  .municipal-settings__fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .municipal-settings__field { min-height: 82px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 15px; background: #f8fafc; display: grid; align-content: center; gap: 5px; }
  .municipal-settings__field small { color: #718096; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .municipal-settings__field strong { overflow-wrap: anywhere; font-size: 13px; }
  .municipal-settings__notifications { padding: 20px; display: grid; gap: 8px; }
  .municipal-settings__section-title { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 16px; }
  .municipal-settings__section-title i { color: #d91b10; }
  .municipal-settings__status { min-height: 72px; padding: 14px; border: 1px solid #b7efd6; border-radius: 15px; background: #effcf6; display: flex; align-items: center; gap: 10px; }
  .municipal-settings__status-icon { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; color: #047857; background: #d2f8e7; }
  .municipal-settings__status strong, .municipal-settings__status small { display: block; }
  .municipal-settings__status strong { color: #065f46; font-size: 13px; }
  .municipal-settings__status small { margin-top: 3px; color: #43806c; font-size: 11px; }
  .municipal-settings__coverage { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .municipal-settings__coverage span { min-height: 52px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 13px; display: flex; align-items: center; gap: 8px; color: #475569; font-size: 11px; font-weight: 700; }
  .municipal-settings__coverage i { color: #d91b10; }
  .municipal-settings__link { min-height: 46px; margin-top: 4px; border-radius: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #fff; background: #d91b10; font-size: 12px; font-weight: 800; text-decoration: none; box-shadow: 0 8px 20px rgba(217,27,16,.18); }
  .municipal-settings__state { min-height: 320px; display: grid; place-items: center; color: #64748b; }
  @media (max-width: 760px) {
    .municipal-settings { padding: 18px 12px; }
    .municipal-settings__grid { grid-template-columns: 1fr; }
    .municipal-settings__fields { grid-template-columns: 1fr; }
  }
`;

export default function ProfilePage() {
  const [identity, setIdentity] = useState<MunicipalIdentity | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/municipal-bfp/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("PROFILE_FETCH_FAILED");
        return response.json() as Promise<{ user: MunicipalIdentity }>;
      })
      .then((payload) => { if (active) setIdentity(payload.user); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <style>{styles}</style>
      <section className="municipal-settings">
        <header className="municipal-settings__head">
          <small className="municipal-settings__eyebrow">MUNICIPAL ACCOUNT</small>
          <h1>Profile &amp; settings</h1>
          <p>Your authenticated station identity and active notification service.</p>
        </header>
        {!identity && !error && <div className="municipal-settings__card municipal-settings__state">Loading secure account details…</div>}
        {error && <div className="municipal-settings__card municipal-settings__state">Account details are temporarily unavailable.</div>}
        {identity && (
          <div className="municipal-settings__grid">
            <article className="municipal-settings__card municipal-settings__profile">
              <div className="municipal-settings__identity">
                <span className="municipal-settings__avatar"><i className="fa-solid fa-user-shield" /></span>
                <div>
                  <strong>{identity.displayName}</strong>
                  <span>{identity.rankOrPosition ?? "Municipal BFP Personnel"}</span>
                </div>
              </div>
              <div className="municipal-settings__fields">
                <div className="municipal-settings__field"><small>Email</small><strong>{identity.email}</strong></div>
                <div className="municipal-settings__field"><small>Station</small><strong>{identity.municipalityName} Fire Station</strong></div>
                <div className="municipal-settings__field"><small>Assignment</small><strong>{identity.assignmentRole.replaceAll("_", " ")}</strong></div>
                <div className="municipal-settings__field"><small>Account security</small><strong>{identity.mustChangePassword ? "Password change required" : "Password active"}</strong></div>
              </div>
            </article>

            <article className="municipal-settings__card municipal-settings__notifications">
              <h2 className="municipal-settings__section-title"><i className="fa-solid fa-bell" /> Notification service</h2>
              <div className="municipal-settings__status">
                <span className="municipal-settings__status-icon"><i className="fa-solid fa-circle-check" /></span>
                <span><strong>In-app notifications active</strong><small>Updates every 5 seconds while this tab is open.</small></span>
              </div>
              <div className="municipal-settings__coverage">
                <span><i className="fa-solid fa-fire" /> New incidents</span>
                <span><i className="fa-solid fa-id-card" /> Resident applications</span>
                <span><i className="fa-solid fa-truck-medical" /> Response updates</span>
                <span><i className="fa-solid fa-user-shield" /> Account notices</span>
              </div>
              <Link className="municipal-settings__link" href="/municipal-bfp/notifications">
                Open notification center <i className="fa-solid fa-arrow-right" />
              </Link>
            </article>
          </div>
        )}
      </section>
    </>
  );
}
