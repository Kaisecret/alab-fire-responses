type FireTypeCount = { type: string; incidents: number };

/**
 * Every known fire type with its count, zero included, most incidents first,
 * so the analytics "Fire type" card lists all types instead of a lone bar.
 * Types the page does not know yet are kept at the end of the ranking.
 */
export function fireTypeRows(counts: FireTypeCount[], knownTypes: string[]): FireTypeCount[] {
  const seen = new Map(counts.map((row) => [row.type, row.incidents]));
  const rows = knownTypes.map((type) => ({ type, incidents: seen.get(type) ?? 0 }));
  for (const row of counts) if (!knownTypes.includes(row.type)) rows.push(row);
  return rows.sort((a, b) => b.incidents - a.incidents);
}
