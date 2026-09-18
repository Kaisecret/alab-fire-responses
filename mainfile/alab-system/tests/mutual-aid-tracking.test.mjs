import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("the declaration tells each side what it means for them", () => {
  const service = source("lib/incidents/backup-escalation.ts");

  /*
   * One notice to every municipal account reading "respond as directed" left
   * the summoned municipalities to work out that it meant them, and gave the
   * municipality that asked nothing about the request they had raised.
   */
  // The phrase survives only in the comment explaining why it was dropped.
  assert.doesNotMatch(service, /summary: `\$\{referenceNumber\}[^`]*respond as directed/);

  // The municipalities being called are told they are wanted, and where.
  assert.match(service, /your municipality is called/);
  assert.match(service, /alarm-summoned:/);
  // The one that asked is told who is coming, not that an alarm exists.
  assert.match(service, /declared on your incident/);
  assert.match(service, /called: \$\{who\}/);
  assert.match(service, /alarm-origin:/);
});

test("the aid board reports the answers rather than the alarm", () => {
  const board = source("app/_components/incident-mutual-aid-board.tsx");

  // Each municipality's answer, in the words a station would use.
  assert.match(board, /Waiting on them/);
  assert.match(board, /Coming/);
  assert.match(board, /Cannot come/);
  // ...and how far away they are, which decides who is worth waiting for.
  assert.match(board, /km away/);
  assert.match(board, /distanceMeters/);
});

test("a helping municipality is given its own station, so the route is theirs", () => {
  const access = source("lib/intermunicipality/incident-access.ts");
  const map = source("app/_components/municipal-incident-map.tsx");

  /*
   * The map already draws a road route from the station to the fire. An
   * observing municipality was sent the incident without a station of its own,
   * so it could see where the fire was but not the road its crews would drive.
   */
  assert.match(access, /observer\.station_latitude_snapshot::float as "stationLatitude"/);
  assert.match(access, /observer\.station_longitude_snapshot::float as "stationLongitude"/);
  assert.match(access, /station\.station_name as "stationName"/);
  assert.match(map, /\/api\/routes\/road\?/);
});

test("the alarm status survives a failure without taking the incident with it", () => {
  const status = source("lib/incidents/alarm-status.ts");

  // The board is context around an incident, not the incident itself.
  assert.match(status, /catch \(error\)/);
  assert.match(status, /return EMPTY/);
  // The first alarm reaches nobody, so it is not reported as help called.
  assert.match(status, /current\.alarmLevel > 1/);
});
