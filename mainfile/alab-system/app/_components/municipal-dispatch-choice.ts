// What the "Acknowledge & Respond" button does. A municipality with a single
// active station has nothing to choose, so the click itself dispatches that
// station; every other case opens the station picker. A person still starts
// every dispatch: this runs only from the button.

export type DispatchChoiceStation = {
  id: string;
  stationName: string;
  activePersonnelCount: number;
};

export type DispatchChoice<S extends DispatchChoiceStation> =
  | { kind: "AUTO"; station: S }
  | { kind: "PICK" };

export type RespondOutcome<S extends DispatchChoiceStation> =
  | { kind: "DISPATCHED"; station: S }
  | { kind: "PICK"; stations: S[] }
  | { kind: "FAILED"; stations: S[]; preselectedStationId: string | null; message: string };

export function chooseDispatchMode<S extends DispatchChoiceStation>(stations: readonly S[]): DispatchChoice<S> {
  if (stations.length === 1 && stations[0].activePersonnelCount > 0) return { kind: "AUTO", station: stations[0] };
  return { kind: "PICK" };
}

export async function respondFromButton<S extends DispatchChoiceStation>(deps: {
  loadStations: () => Promise<S[]>;
  dispatchStation: (stationId: string) => Promise<void>;
}): Promise<RespondOutcome<S>> {
  let stations: S[];
  try {
    stations = await deps.loadStations();
  } catch (error) {
    return { kind: "FAILED", stations: [], preselectedStationId: null, message: messageOf(error, "Unable to load station choices.") };
  }
  const choice = chooseDispatchMode(stations);
  if (choice.kind === "PICK") return { kind: "PICK", stations };
  try {
    await deps.dispatchStation(choice.station.id);
    return { kind: "DISPATCHED", station: choice.station };
  } catch (error) {
    return { kind: "FAILED", stations, preselectedStationId: choice.station.id, message: messageOf(error, "Unable to start response.") };
  }
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
