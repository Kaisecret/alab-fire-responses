"use client";

export type AlarmSummonedMunicipality = {
  municipalityId: string;
  municipalityName: string;
  alarmLevel: number;
  distanceMeters: number | null;
  assistanceStatus:
    | "REQUESTED"
    | "ACCEPTED"
    | "PARTIALLY_ACCEPTED"
    | "REJECTED"
    | "CANCELLED"
    | "COMPLETED"
    | null;
  offeredFiretrucks: number | null;
  offeredPersonnel: number | null;
  respondedAt: string | null;
};

export type IncidentAlarmStatus = {
  level: number | null;
  levelLabel: string | null;
  reachSummary: string | null;
  declaredAt: string | null;
  summoned: AlarmSummonedMunicipality[];
};

/** How each answer reads, in the words a station would use. */
const ANSWER: Record<string, { label: string; tone: string; icon: string }> = {
  REQUESTED: { label: "Waiting on them", tone: "waiting", icon: "fa-hourglass-half" },
  ACCEPTED: { label: "Coming", tone: "coming", icon: "fa-check" },
  PARTIALLY_ACCEPTED: { label: "Sending what they can", tone: "coming", icon: "fa-check" },
  REJECTED: { label: "Cannot come", tone: "declined", icon: "fa-xmark" },
  CANCELLED: { label: "Stood down", tone: "muted", icon: "fa-ban" },
  COMPLETED: { label: "Returned", tone: "muted", icon: "fa-flag-checkered" },
};

function kilometres(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "";
  return meters < 1000 ? `${Math.round(meters)} m away` : `${(meters / 1000).toFixed(1)} km away`;
}

function offered(entry: AlarmSummonedMunicipality): string {
  const parts: string[] = [];
  if (entry.offeredFiretrucks) parts.push(`${entry.offeredFiretrucks} truck${entry.offeredFiretrucks > 1 ? "s" : ""}`);
  if (entry.offeredPersonnel) parts.push(`${entry.offeredPersonnel} personnel`);
  return parts.join(" + ");
}

function ordinal(level: number): string {
  const tens = level % 100;
  if (tens >= 11 && tens <= 13) return `${level}th`;
  const suffix: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  return `${level}${suffix[level % 10] ?? "th"}`;
}

const styles = `
  .mab-wrap {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
  }
  .mab-head {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.9rem 1.15rem;
    background: #FEF2F2;
    border-bottom: 1px solid #FECACA;
  }
  .mab-head-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 11px;
    background: #DC2626;
    color: #FFFFFF;
    font-size: 0.95rem;
    box-shadow: 0 4px 10px rgba(220, 38, 38, 0.25);
  }
  .mab-head-text { min-width: 0; flex: 1 1 auto; }
  .mab-head strong {
    display: block;
    font-size: 0.95rem;
    font-weight: 800;
    color: #7F1D1D;
    letter-spacing: -0.01em;
  }
  .mab-head-text span { display: block; font-size: 0.76rem; color: #9F1239; margin-top: 1px; }

  .mab-tally {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.3rem;
    flex-shrink: 0;
  }
  .mab-tally-count {
    font-size: 0.78rem;
    font-weight: 700;
    color: #7F1D1D;
    white-space: nowrap;
  }
  .mab-tally-count b {
    font-size: 1.05rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .mab-bars { display: flex; gap: 3px; }
  .mab-bar { width: 18px; height: 5px; border-radius: 3px; background: #FDE68A; }
  .mab-bar.coming { background: #16A34A; }
  .mab-bar.declined { background: #DC2626; }
  .mab-bar.muted { background: #CBD5E1; }

  .mab-list { list-style: none; margin: 0; padding: 0.2rem 1.15rem; }
  .mab-row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.85rem;
    padding: 0.75rem 0;
    border-top: 1px solid #F1F5F9;
  }
  .mab-row:first-child { border-top: none; }
  .mab-mark {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    font-size: 0.8rem;
  }
  .mab-mark.coming { background: #DCFCE7; color: #15803D; }
  .mab-mark.waiting { background: #FEF3C7; color: #B45309; }
  .mab-mark.declined { background: #FEE2E2; color: #B91C1C; }
  .mab-mark.muted { background: #F1F5F9; color: #64748B; }

  .mab-who { min-width: 0; }
  .mab-name { font-size: 0.92rem; font-weight: 800; color: #0F172A; letter-spacing: -0.01em; }
  .mab-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.8rem;
    font-size: 0.74rem;
    color: #64748B;
    margin-top: 2px;
  }
  .mab-meta span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .mab-meta i { font-size: 0.7rem; color: #94A3B8; }

  .mab-answer {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    text-align: right;
  }
  .mab-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.28rem 0.7rem;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: 0.74rem;
    font-weight: 800;
    white-space: nowrap;
  }
  .mab-pill.coming { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
  .mab-pill.waiting { background: #FFFBEB; color: #B45309; border-color: #FDE68A; }
  .mab-pill.declined { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
  .mab-pill.muted { background: #F8FAFC; color: #475569; border-color: #E2E8F0; }
  .mab-sending { font-size: 0.74rem; font-weight: 600; color: #475569; }
  .mab-sending b { color: #0F172A; font-weight: 750; }

  .mab-none {
    margin: 0;
    padding: 1rem 1.15rem;
    font-size: 0.8rem;
    color: #64748B;
    text-align: center;
  }

  @media (max-width: 560px) {
    .mab-head { flex-wrap: wrap; }
    .mab-tally { flex-direction: row; align-items: center; gap: 0.6rem; width: 100%; padding-left: calc(38px + 0.85rem); }
    .mab-row { grid-template-columns: 34px minmax(0, 1fr); }
    .mab-answer { grid-column: 2; flex-direction: row; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem; }
  }
`;

/**
 * What became of a call for help, for the municipality that made it.
 *
 * They raised the request and watched it go to the province, so another alarm
 * tells them nothing. What they cannot see is which municipalities the province
 * reached and which of them are actually coming, which is what this answers.
 */
export function IncidentMutualAidBoard({ alarmStatus }: { alarmStatus?: IncidentAlarmStatus | null }) {
  if (!alarmStatus?.level) return null;

  const { summoned } = alarmStatus;
  const coming = summoned.filter(
    (entry) => entry.assistanceStatus === "ACCEPTED" || entry.assistanceStatus === "PARTIALLY_ACCEPTED",
  ).length;

  return (
    <>
      <style>{styles}</style>
      <section className="mab-wrap" aria-labelledby="mab-heading">
        <header className="mab-head">
          <span className="mab-head-icon" aria-hidden="true">
            <i className="fa-solid fa-tower-broadcast" />
          </span>
          <div className="mab-head-text">
            <strong id="mab-heading">
              {alarmStatus.levelLabel} declared by the province
            </strong>
            {alarmStatus.reachSummary && <span>{alarmStatus.reachSummary}</span>}
          </div>
          {summoned.length > 0 && (
            <div className="mab-tally">
              <span className="mab-tally-count">
                <b>{coming}</b> of <b>{summoned.length}</b> coming
              </span>
              <span className="mab-bars" aria-hidden="true">
                {summoned.map((entry) => (
                  <span
                    key={entry.municipalityId}
                    className={`mab-bar ${(ANSWER[entry.assistanceStatus ?? "REQUESTED"] ?? ANSWER.REQUESTED).tone}`}
                  />
                ))}
              </span>
            </div>
          )}
        </header>

        {summoned.length === 0 ? (
          <p className="mab-none">No municipality has been called yet.</p>
        ) : (
          <ul className="mab-list">
            {summoned.map((entry) => {
              const answer = ANSWER[entry.assistanceStatus ?? "REQUESTED"] ?? ANSWER.REQUESTED;
              const sending = offered(entry);
              const distance = kilometres(entry.distanceMeters);
              // Every row was called at the declared level unless the alarm has since been raised.
              const earlierAlarm = Boolean(entry.alarmLevel) && entry.alarmLevel !== alarmStatus.level;
              return (
                <li className="mab-row" key={entry.municipalityId}>
                  <span className={`mab-mark ${answer.tone}`} aria-hidden="true">
                    <i className={`fa-solid ${answer.icon}`} />
                  </span>
                  <div className="mab-who">
                    <div className="mab-name">{entry.municipalityName}</div>
                    {(distance || earlierAlarm) && (
                      <div className="mab-meta">
                        {distance && (
                          <span>
                            <i className="fa-solid fa-location-dot" aria-hidden="true" />
                            {distance}
                          </span>
                        )}
                        {earlierAlarm && (
                          <span>
                            <i className="fa-solid fa-bell" aria-hidden="true" />
                            Called at the {ordinal(entry.alarmLevel)} alarm
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mab-answer">
                    <span className={`mab-pill ${answer.tone}`}>
                      <i className={`fa-solid ${answer.icon}`} aria-hidden="true" />
                      {answer.label}
                    </span>
                    {sending && (
                      <span className="mab-sending">
                        Sending <b>{sending}</b>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
