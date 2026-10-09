import { formatStationDistance } from "../../lib/municipal-bfp/nearest-station";
import type { NearestStationCandidate, RankedStation } from "../../lib/municipal-bfp/nearest-station";

export function MunicipalStationRecommendation({ level, stations }: {
  level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null | undefined;
  stations: RankedStation<NearestStationCandidate>[];
}) {
  const recommended = stations.filter((station) => station.recommended);
  const truckCount = recommended.reduce((total, station) => total + (station.recommendedTruckCount ?? 0), 0);
  const farthest = Math.max(1, ...stations.map((station) => station.distanceMeters ?? 0));
  const staffed = stations.filter((station) => station.activePersonnelCount > 0);
  const summary = !recommended.length
    ? !staffed.length ? "No personnel on duty"
      : level !== "LOW" && staffed.every((station) => station.serviceableTruckCount === 0)
        ? "No staffed station has a serviceable truck"
        : "Confirm station distance before choosing a team"
    : level === "LOW" ? "Crew verification from the nearest staffed station"
      : recommended.some((station) => station.recommendedTruckCount === null)
        ? "Confirm truck inventory at the recommended stations"
        : `${truckCount} ${truckCount === 1 ? "truck" : "trucks"} from ${recommended.length} ${recommended.length === 1 ? "station" : "stations"}`;

  return (
    <div className="mbfp-nearest">
      <div className="mbfp-nearest-head">
        <span className="mbfp-nearest-title">
          <i className="fa-solid fa-truck" aria-hidden="true" /> Fire truck recommendation
        </span>
        <span className="mbfp-nearest-note" role="status" aria-atomic="true">{level ? `${level} danger · ${summary}` : `Danger not assessed · ${summary}`}</span>
      </div>
      <ul className="mbfp-nearest-list">
        {stations.map((station) => {
          const hasCrew = station.activePersonnelCount > 0;
          const width = station.distanceMeters === null ? 0 : Math.max(6, (station.distanceMeters / farthest) * 100);
          return (
            <li key={station.id} className={`mbfp-nearest-row${station.recommended ? " is-recommended" : ""}${hasCrew ? "" : " is-unstaffed"}`}>
              <span className="mbfp-nearest-icon" aria-hidden="true">
                <i className={`fa-solid ${station.recommended ? "fa-star" : "fa-building-shield"}`} />
              </span>
              <div className="mbfp-nearest-main">
                <div className="mbfp-nearest-name">
                  <strong>{station.displayName}</strong>
                  {station.recommended && <span className="mbfp-nearest-badge">Recommended</span>}
                </div>
                {station.head && <span className="mbfp-nearest-sub">Head: {station.head}</span>}
                <span className="mbfp-nearest-sub">
                  {station.serviceableTruckCount == null ? "Truck inventory unknown"
                    : `${station.serviceableTruckCount} serviceable ${station.serviceableTruckCount === 1 ? "truck" : "trucks"}`}
                  {station.recommended && (level === "LOW" ? " · Crew verification"
                    : station.recommendedTruckCount === null ? " · Confirm truck count"
                      : ` · Recommend ${station.recommendedTruckCount} ${station.recommendedTruckCount === 1 ? "truck" : "trucks"}`)}
                </span>
                <span className="mbfp-nearest-bar" aria-hidden="true"><span style={{ width: `${width}%` }} /></span>
              </div>
              <div className="mbfp-nearest-figures">
                <strong>{formatStationDistance(station.distanceMeters)}</strong>
                <span>{hasCrew ? `${station.activePersonnelCount} active personnel` : "No active personnel"}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mbfp-nearest-note" style={{ margin: "0.75rem 0 0" }}>
        Distances are straight-line. Confirm truck and crew availability before dispatch.
      </p>
    </div>
  );
}
