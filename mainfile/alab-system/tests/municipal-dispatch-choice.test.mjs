import assert from "node:assert/strict";
import test from "node:test";

import { chooseDispatchMode, respondFromButton } from "../app/_components/municipal-dispatch-choice.ts";

const station = (id, activePersonnelCount = 1) => ({ id, stationName: `Station ${id}`, activePersonnelCount });
const neverDispatch = async () => {
  throw new Error("must not dispatch");
};

test("a municipality with one staffed station dispatches it without a choice", () => {
  const choice = chooseDispatchMode([station("a")]);
  assert.equal(choice.kind, "AUTO");
  assert.equal(choice.station.id, "a");
});

test("(Option A) two stations open the picker even when only one is staffed", () => {
  assert.deepEqual(chooseDispatchMode([station("a", 0), station("b", 1)]), { kind: "PICK" });
  assert.deepEqual(chooseDispatchMode([station("a"), station("b")]), { kind: "PICK" });
});

test("a lone station with nobody on duty opens the picker instead of dispatching", () => {
  assert.deepEqual(chooseDispatchMode([station("a", 0)]), { kind: "PICK" });
});

test("a municipality with no active station opens the picker so its empty message shows", () => {
  assert.deepEqual(chooseDispatchMode([]), { kind: "PICK" });
});

test("the button dispatches exactly the lone station", async () => {
  const sent = [];
  const outcome = await respondFromButton({
    loadStations: async () => [station("a")],
    dispatchStation: async (id) => { sent.push(id); },
  });
  assert.deepEqual(sent, ["a"]);
  assert.equal(outcome.kind, "DISPATCHED");
  assert.equal(outcome.station.id, "a");
});

test("(Option A) a two-station municipality never dispatches from the button", async () => {
  const stations = [station("a", 0), station("b", 2)];
  const outcome = await respondFromButton({ loadStations: async () => stations, dispatchStation: neverDispatch });
  assert.deepEqual(outcome, { kind: "PICK", stations });
});

test("a refused dispatch opens the picker with the station ticked and the server's message", async () => {
  const stations = [station("a")];
  const outcome = await respondFromButton({
    loadStations: async () => stations,
    dispatchStation: async () => { throw new Error("Every selected station must have active BFP personnel."); },
  });
  assert.deepEqual(outcome, {
    kind: "FAILED",
    stations,
    preselectedStationId: "a",
    message: "Every selected station must have active BFP personnel.",
  });
});

test("a failed station list opens the picker with the error instead of doing nothing", async () => {
  const outcome = await respondFromButton({
    loadStations: async () => { throw new Error("Unable to load station dispatch choices."); },
    dispatchStation: neverDispatch,
  });
  assert.deepEqual(outcome, {
    kind: "FAILED",
    stations: [],
    preselectedStationId: null,
    message: "Unable to load station dispatch choices.",
  });
});

test("an error without a message still gives the officer a readable reason", async () => {
  const outcome = await respondFromButton({
    loadStations: async () => [station("a")],
    dispatchStation: async () => { throw new Error(""); },
  });
  assert.equal(outcome.message, "Unable to start response.");
});
