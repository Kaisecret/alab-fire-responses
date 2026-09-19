/** The alarm-created observer row points at the response the helper joins. */
export async function findMutualAidDispatchId(database, fireReportId, municipalityId) {
  const result = await database.query(
    `select observer.dispatch_id as "dispatchId"
       from incident_municipal_observers observer
       join incident_dispatches dispatch
         on dispatch.id = observer.dispatch_id and dispatch.status = 'ACTIVE'
       join intermunicipal_assistance_requests assistance
         on assistance.observer_id = observer.id
        and assistance.dispatch_id = observer.dispatch_id
        and assistance.fire_report_id = observer.fire_report_id
        and assistance.recipient_municipality_id = observer.observer_municipality_id
        and assistance.status in ('ACCEPTED', 'PARTIALLY_ACCEPTED')
      where observer.fire_report_id = $1
        and observer.observer_municipality_id = $2
        and observer.status = 'ACTIVE'
      limit 1
      for update of observer, dispatch`,
    [fireReportId, municipalityId],
  );
  return result.rows[0]?.dispatchId ?? null;
}
