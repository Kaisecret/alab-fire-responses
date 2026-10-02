// Turns the stored Level of Danger reasons into what a BFP screen shows: one
// chip per reported fire type (marking the one that set the level) and the
// remaining reasons grouped by the criterion they come from, so each can carry
// a matching icon. Reasons are stored as plain sentences; this only reads them.

export type DangerFactorKind =
  | "wind" | "weather" | "distance" | "density" | "material" | "route" | "vehicle" | "rubbish" | "other";

export type DangerTypeChip = {
  fireType: string;
  level: string | null;
  score: number | null;
  setsLevel: boolean;
};

export type DangerFactorRow = { text: string; kind: DangerFactorKind };

const LABEL_TO_TYPE: Record<string, string> = {
  "House/Building": "HOUSE_BUILDING",
  Grass: "GRASS",
  Forest: "FOREST",
  Vehicle: "VEHICLE",
  Rubbish: "OTHER",
};

const LEAD = /^(.+?) fire sets the level \(highest of .+\)$/;
const ALSO = /^Also burning: (.+?) fire \((LOW|MODERATE|HIGH|CRITICAL), (\d+)\/100\)$/;

// Order matters: the first matching rule names the criterion.
const RULES: Array<[DangerFactorKind, RegExp]> = [
  ["distance", /nearest mapped building|distance unavailable/i],
  ["vehicle", /vehicle/i],
  ["rubbish", /rubbish/i],
  ["wind", /hangin|wind|gale/i],
  ["weather", /\binit\b|tuyong|°c|humid|\brh\b/i],
  ["route", /eskinita|kalsada|road|dead-end|daan|alley|hose|off-road|street|looban/i],
  ["material", /material|kahoy|nipa|kawayan|concrete|commercial|storage|flammable/i],
  ["density", /dikit|kabahayan|magkakalayo|bahay|density|building|houses|structures|cluster|mapped gap|open buildings/i],
];

export function dangerFactorKind(text: string): DangerFactorKind {
  return RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? "other";
}

export function describeDangerFactors(input: {
  factors: readonly string[] | null | undefined;
  fireType: string;
  fireTypes?: readonly string[] | null;
  level: string | null;
  score: number | null;
}) {
  const factors = (input.factors ?? []).filter((factor) => typeof factor === "string" && factor.trim());
  const reported = input.fireTypes?.length ? [...input.fireTypes] : [input.fireType];
  const others = new Map<string, { level: string; score: number }>();
  const rows: DangerFactorRow[] = [];
  for (const factor of factors) {
    if (LEAD.test(factor)) continue;
    const also = factor.match(ALSO);
    if (also) {
      const type = LABEL_TO_TYPE[also[1]];
      if (type) others.set(type, { level: also[2], score: Number(also[3]) });
      continue;
    }
    rows.push({ text: factor, kind: dangerFactorKind(factor) });
  }
  // The type that set the level first, then the rest in the order reported.
  const ordered = [input.fireType, ...reported.filter((type) => type !== input.fireType)];
  const types: DangerTypeChip[] = ordered.map((fireType) => fireType === input.fireType
    ? { fireType, level: input.level, score: input.score, setsLevel: reported.length > 1 }
    : { fireType, level: others.get(fireType)?.level ?? null, score: others.get(fireType)?.score ?? null, setsLevel: false });
  return { types, rows, mixed: reported.length > 1 };
}
