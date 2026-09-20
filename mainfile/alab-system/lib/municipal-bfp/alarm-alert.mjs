const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIENCES = new Set(["ORIGIN", "SUMMONED"]);

function validUuid(value) {
  return typeof value === "string" && UUID.test(value);
}

/** Resume browser audio when needed and create exactly one active alert tone. */
export async function ensureAlertTone(context, toneIsActive, startTone, isCancelled = () => false) {
  if (!context || toneIsActive || typeof startTone !== "function") return null;
  if (context.state === "suspended") await context.resume();
  if (context.state !== "running" || isCancelled()) return null;
  const stopTone = startTone(context);
  if (isCancelled()) {
    stopTone?.();
    return null;
  }
  return stopTone;
}

/** A stable payload shared by the notification writer and alarm client. */
export function buildAlarmNotificationContext(input) {
  const base = {
    audience: input.audience,
    alarmLevel: input.alarmLevel,
    fireReportId: input.fireReportId,
    referenceNumber: input.referenceNumber,
    location: input.location,
  };
  if (input.audience === "SUMMONED") {
    return {
      ...base,
      assistanceRequestId: input.assistanceRequestId,
      requestedFiretrucks: input.requestedFiretrucks,
      requestedPersonnel: input.requestedPersonnel,
    };
  }
  return { ...base, summonedMunicipalities: input.summonedMunicipalities ?? [] };
}

function isAlarmContext(value) {
  if (!value || typeof value !== "object") return false;
  if (!AUDIENCES.has(value.audience)) return false;
  if (![2, 3, 4].includes(value.alarmLevel)) return false;
  if (!validUuid(value.fireReportId)) return false;
  if (typeof value.referenceNumber !== "string" || typeof value.location !== "string") return false;
  if (value.audience === "SUMMONED") {
    return validUuid(value.assistanceRequestId)
      && Number.isInteger(value.requestedFiretrucks)
      && Number.isInteger(value.requestedPersonnel);
  }
  return Array.isArray(value.summonedMunicipalities);
}

function isAssistanceContext(value) {
  return Boolean(value)
    && typeof value === "object"
    && value.audience === "ASSISTANCE"
    && validUuid(value.fireReportId)
    && validUuid(value.assistanceRequestId)
    && typeof value.referenceNumber === "string"
    && typeof value.location === "string"
    && typeof value.requesterMunicipalityName === "string"
    && Number.isInteger(value.requestedFiretrucks)
    && Number.isInteger(value.requestedPersonnel)
    && (value.requestNote === null || typeof value.requestNote === "string")
    && value.isProvincialCommand === false;
}

/** The newest unread alarm or assistance call that needs this officer's action. */
export function selectPendingMunicipalAlarm(notifications) {
  if (!Array.isArray(notifications)) return null;
  const newestFirst = notifications
    .filter((notification) => {
      if (notification?.eventType === "ALARM_DECLARED") return isAlarmContext(notification.context);
      if (notification?.eventType === "ASSISTANCE_REQUESTED") return isAssistanceContext(notification.context);
      return false;
    })
    .sort((left, right) => Date.parse(right.createdAt ?? 0) - Date.parse(left.createdAt ?? 0));
  const seenAlerts = new Set();
  for (const notification of newestFirst) {
    const alertKey = notification.eventType === "ALARM_DECLARED"
      ? `alarm:${notification.context.fireReportId}`
      : `assistance:${notification.context.assistanceRequestId}`;
    if (seenAlerts.has(alertKey)) continue;
    seenAlerts.add(alertKey);
    if (notification.readAt === null) return notification;
  }
  return null;
}

/** Requests the client must make after the officer presses the primary action. */
export function getMunicipalAlarmAction(notification) {
  if (notification?.eventType === "ASSISTANCE_REQUESTED" && isAssistanceContext(notification.context)) {
    return {
      audience: "ASSISTANCE",
      incidentId: notification.context.fireReportId,
      assistanceRequestId: notification.context.assistanceRequestId,
      destination: `/municipal-bfp/active-incidents?incident=${notification.context.fireReportId}`,
    };
  }
  if (!notification || notification.eventType !== "ALARM_DECLARED" || !isAlarmContext(notification.context)) return null;
  const context = notification.context;
  if (context.audience === "SUMMONED") {
    return {
      audience: "SUMMONED",
      incidentId: context.fireReportId,
      assistanceRequestId: context.assistanceRequestId,
      assistanceBody: {
        action: "ACCEPT",
        offeredFiretrucks: context.requestedFiretrucks,
        offeredPersonnel: context.requestedPersonnel,
        responseNote: "Provincial alarm acknowledged; preparing municipal BFP deployment.",
      },
      destination: `/municipal-bfp/active-incidents?incident=${context.fireReportId}&assign=1`,
    };
  }
  return {
    audience: "ORIGIN",
    incidentId: context.fireReportId,
    destination: `/municipal-bfp/active-incidents?incident=${context.fireReportId}`,
  };
}

export function shouldShowMutualAidBoard(accessScope, alarmLevel) {
  return accessScope === "ORIGIN" && Number(alarmLevel) >= 2;
}

export function shouldShowStationAssignment(accessScope, assistanceStatus, localDispatchAssigned = false) {
  if (accessScope === "ORIGIN") return true;
  return !localDispatchAssigned
    && (assistanceStatus === "ACCEPTED" || assistanceStatus === "PARTIALLY_ACCEPTED");
}
