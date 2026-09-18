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
  return parts.join(" · ");
}

const styles = `
  .mab-wrap {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: hidden;
  }
  .mab-head {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.85rem 1rem;
    background: linear-gradient(135deg, #FEF2F2, #FFF7ED);
    border-bottom: 1px solid #FECACA;
  }
  .mab-head-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: 9px;
    background: #FFFFFF;
    border: 1px solid #FECACA;
    color: #DC2626;
    font-size: 0.85rem;
  }
  .mab-head strong {
    display: block;
    font-size: 0.88rem;
    font-weight: 800;
    color: #7F1D1D;
  }
  .mab-head span { font-size: 0.74rem; color: #9A3412; }

  .mab-list { display: flex; flex-direction: column; }
  .mab-row {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.7rem 1rem;
    border-top: 1px solid #F1F5F9;
  }
  .mab-row:first-child { border-top: none; }
  .mab-mark {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    border-radius: 50%;
    font-size: 0.62rem;
  }
  .mab-mark.coming { background: #DCFCE7; color: #15803D; }
  .mab-mark.waiting { background: #FEF3C7; color: #B45309; }
  .mab-mark.declined { background: #FEE2E2; color: #B91C1C; }
  .mab-mark.muted { background: #F1F5F9; color: #64748B; }

  .mab-who { min-width: 0; flex: 1 1 auto; }
  .mab-name { font-size: 0.84rem; font-weight: 800; color: #0F172A; }
  .mab-meta { font-size: 0.72rem; color: #64748B; margin-top: 1px; }

  .mab-answer {
    font-size: 0.72rem;
    font-weight: 800;
    flex-shrink: 0;
    text-align: right;
  }
  .mab-answer.coming { color: #15803D; }
  .mab-answer.waiting { color: #B45309; }
  .mab-answer.declined { color: #B91C1C; }
  .mab-answer.muted { color: #64748B; }
  .mab-answer small { display: block; font-weight: 600; color: #94A3B8; margin-top: 1px; }

  .mab-none {
    padding: 1rem;
    font-size: 0.78rem;
    color: #64748B;
    text-align: center;
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
          <div>
            <strong id="mab-heading">
              {alarmStatus.levelLabel} declared by the province
            </strong>
            <span>
              {alarmStatus.reachSummary}
              {summoned.length > 0 && ` · ${coming} of ${summoned.length} coming`}
            </span>
          </div>
        </header>

        {summoned.length === 0 ? (
          <p className="mab-none">No municipality has been called yet.</p>
        ) : (
          <div className="mab-list">
            {summoned.map((entry) => {
              const answer = ANSWER[entry.assistanceStatus ?? "REQUESTED"] ?? ANSWER.REQUESTED;
              const sending = offered(entry);
              return (
                <div className="mab-row" key={entry.municipalityId}>
                  <span className={`mab-mark ${answer.tone}`} aria-hidden="true">
                    <i className={`fa-solid ${answer.icon}`} />
                  </span>
                  <div className="mab-who">
                    <div className="mab-name">{entry.municipalityName}</div>
                    <div className="mab-meta">
                      {kilometres(entry.distanceMeters)}
                      {entry.alarmLevel ? ` · called at the ${entry.alarmLevel}${entry.alarmLevel === 2 ? "nd" : entry.alarmLevel === 3 ? "rd" : "th"} alarm` : ""}
                    </div>
                  </div>
                  <div className={`mab-answer ${answer.tone}`}>
                    {answer.label}
                    {sending && <small>{sending}</small>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
