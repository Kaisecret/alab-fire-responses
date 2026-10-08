import assert from "node:assert/strict";
import test from "node:test";

const { buildLocalStationCards, isLocalBackupEligible, splitStationHead } = await import("../lib/municipal-bfp/local-backup-options.ts");

// San Jose's three stations; the fire is in Funda-Dalipe, north of the town.
const FIRE = { latitude: 10.765727, longitude: 121.930322 };
const station = (id, stationName, latitude, longitude, extra = {}) => ({
  id, stationName, latitude, longitude, activePersonnelCount: 1, onThisFire: false, busyElsewhere: false, ...extra,
});
const SAN_JOSE = [
  station("main", "San Jose Fire Station · Head: FSINSP Macario I Montaña Jr", 10.7431, 121.9394),
  station("dalipe", "Dalipe Fire Sub-Station · Head: SFO3 Edgardo P. Villareal", 10.756, 121.9355),
  station("san-angel", "San Angel Fire Sub-Station · Head: SFO3 Marilou S. Navarro", 10.7388, 121.9503, { onThisFire: true }),
];

test("a station name splits into its name and its head", () => {
  assert.deepEqual(splitStationHead("Dalipe Fire Sub-Station · Head: SFO3 Edgardo P. Villareal"),
    { name: "Dalipe Fire Sub-Station", head: "SFO3 Edgardo P. Villareal" });
  assert.deepEqual(splitStationHead("Dalipe Fire Sub-Station"), { name: "Dalipe Fire Sub-Station", head: null });
});

test("cards run nearest first and the nearest free station is recommended", () => {
  const cards = buildLocalStationCards(SAN_JOSE, FIRE);
  assert.deepEqual(cards.map((card) => card.id), ["dalipe", "main", "san-angel"]);
  assert.deepEqual(cards.map((card) => card.status), ["AVAILABLE", "AVAILABLE", "ON_THIS_FIRE"]);
  assert.deepEqual(cards.map((card) => card.recommended), [true, false, false]);
  assert.deepEqual(cards.map((card) => card.selectable), [true, true, false]);
  assert.equal(cards[0].name, "Dalipe Fire Sub-Station");
  assert.equal(cards[0].head, "SFO3 Edgardo P. Villareal");
  assert.ok(cards[0].distanceMeters > 1000 && cards[0].distanceMeters < 1500, `${cards[0].distanceMeters} m`);
});

test("a busy station can still be asked for, but a free one is recommended first", () => {
  const cards = buildLocalStationCards(SAN_JOSE.map((s) => s.id === "dalipe" ? { ...s, busyElsewhere: true } : s), FIRE);
  const byId = Object.fromEntries(cards.map((card) => [card.id, card]));
  assert.equal(byId.dalipe.status, "BUSY");
  assert.equal(byId.dalipe.selectable, true);
  assert.equal(byId.dalipe.recommended, false);
  assert.equal(byId.main.recommended, true);
});

test("with no free station, the nearest busy one is recommended", () => {
  const busy = SAN_JOSE.map((s) => s.onThisFire ? s : { ...s, busyElsewhere: true });
  const cards = buildLocalStationCards(busy, FIRE);
  assert.equal(cards.find((card) => card.recommended)?.id, "dalipe");
});

test("a station with nobody on duty cannot be picked", () => {
  const cards = buildLocalStationCards(SAN_JOSE.map((s) => s.id === "main" ? { ...s, activePersonnelCount: 0 } : s), FIRE);
  const main = cards.find((card) => card.id === "main");
  assert.equal(main.status, "NO_CREW");
  assert.equal(main.selectable, false);
});

test("local backup is offered only to towns with two stations and one still free", () => {
  assert.equal(isLocalBackupEligible(buildLocalStationCards(SAN_JOSE, FIRE)), true);
  // Hamtic: one station, already on the fire.
  assert.equal(isLocalBackupEligible(buildLocalStationCards([station("hamtic", "Hamtic Fire Station", 10.6969, 121.9803, { onThisFire: true })], FIRE)), false);
  // A two-station town with both stations already on the fire.
  assert.equal(isLocalBackupEligible(buildLocalStationCards(SAN_JOSE.slice(0, 2).map((s) => ({ ...s, onThisFire: true })), FIRE)), false);
  // The only station left has no crew.
  assert.equal(isLocalBackupEligible(buildLocalStationCards([
    station("a", "A", 10.75, 121.94, { onThisFire: true }),
    station("b", "B", 10.76, 121.94, { activePersonnelCount: 0 }),
  ], FIRE)), false);
});
