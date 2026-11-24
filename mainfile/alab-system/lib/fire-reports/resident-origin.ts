/**
 * One line telling the officer where the reporting resident is registered,
 * e.g. "Verified resident from San Jose · reported in Hamtic". Phone callers
 * and residents without a registered address get null (nothing is shown).
 */
export function describeResidentOrigin(
  homeMunicipality: string | null | undefined,
  reportedMunicipality: string | null | undefined,
  verified: boolean | null | undefined,
): string | null {
  const who = verified ? "Verified resident" : "Resident";
  const home = homeMunicipality?.trim();
  if (!home) return verified ? who : null;

  const reported = reportedMunicipality?.trim();
  const away = reported && reported.toLowerCase() !== home.toLowerCase();
  return away ? `${who} from ${home} · reported in ${reported}` : `${who} from ${home}`;
}
