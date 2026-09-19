/**
 * Loads the observer row that a municipal officer is acknowledging.
 *
 * A province-wide alarm may call a municipality before it has registered a
 * station. The observer still exists in that case, so the station relationship
 * must remain optional all the way through the acknowledgment read.
 */
export async function findObserverForAcknowledgment(database, fireReportId, municipalityId) {
  const result = await database.query(
    `select o.id, o.fire_report_id, o.dispatch_id, o.origin_municipality_id,
            o.observer_municipality_id, m.name as observer_municipality_name,
            o.nearest_station_id,
            coalesce(s.station_name, m.name || ' Municipal BFP') as station_name,
            o.distance_meters, o.status, o.acknowledged_by_user_id,
            o.acknowledged_at
       from incident_municipal_observers o
       join municipalities m on m.id = o.observer_municipality_id
       left join municipal_bfp_stations s on s.id = o.nearest_station_id
      where o.fire_report_id = $1
        and o.observer_municipality_id = $2
      for update of o`,
    [fireReportId, municipalityId],
  );
  return result.rows[0] ?? null;
}
