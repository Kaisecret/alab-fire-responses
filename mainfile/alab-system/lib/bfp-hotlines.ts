// Bureau of Fire Protection - Antique hotline numbers, as printed on the
// provincial "Act fast, call the nearest fire station" poster. Mobile numbers
// work on a voice call with no internet, which is why residents see them when
// the app is offline. Municipality names match the `municipalities` table.

export type BfpHotline = {
  id: string;
  name: string;
  municipality: string;
  /** Local 11-digit mobile number, e.g. 09185209634. */
  phone: string;
  kind: "station" | "substation" | "provincial";
};

export const BFP_HOTLINES: readonly BfpHotline[] = [
  { id: "anini-y", name: "Anini-y Fire Station", municipality: "Anini-y", phone: "09568515306", kind: "station" },
  { id: "barbaza", name: "Barbaza Fire Station", municipality: "Barbaza", phone: "09658815193", kind: "station" },
  { id: "belison", name: "Belison Fire Station", municipality: "Belison", phone: "09061451222", kind: "station" },
  { id: "bugasong", name: "Bugasong Fire Station", municipality: "Bugasong", phone: "09260842418", kind: "station" },
  { id: "caluya", name: "Caluya Fire Station", municipality: "Caluya", phone: "09692447646", kind: "station" },
  { id: "culasi", name: "Culasi Fire Station", municipality: "Culasi", phone: "09971852225", kind: "station" },
  { id: "hamtic", name: "Hamtic Fire Station", municipality: "Hamtic", phone: "09185209634", kind: "station" },
  { id: "laua-an", name: "Laua-an Fire Station", municipality: "Laua-an", phone: "09268921182", kind: "station" },
  { id: "libertad", name: "Libertad Fire Station", municipality: "Libertad", phone: "09815648218", kind: "station" },
  { id: "pandan", name: "Pandan Fire Station", municipality: "Pandan", phone: "09382708059", kind: "station" },
  { id: "patnongon", name: "Patnongon Fire Station", municipality: "Patnongon", phone: "09173089808", kind: "station" },
  { id: "san-jose", name: "San Jose Fire Station (Central)", municipality: "San Jose de Buenavista", phone: "09153248833", kind: "station" },
  { id: "dalipe", name: "Dalipe Fire Sub Station", municipality: "San Jose de Buenavista", phone: "09175167979", kind: "substation" },
  { id: "san-angel", name: "San Angel Fire Sub Station", municipality: "San Jose de Buenavista", phone: "09454910171", kind: "substation" },
  { id: "san-remigio", name: "San Remigio Fire Station", municipality: "San Remigio", phone: "09978893820", kind: "station" },
  { id: "sebaste", name: "Sebaste Fire Station", municipality: "Sebaste", phone: "09171162772", kind: "station" },
  { id: "sibalom", name: "Sibalom Fire Station", municipality: "Sibalom", phone: "09173166567", kind: "station" },
  { id: "tibiao", name: "Tibiao Fire Station", municipality: "Tibiao", phone: "09487190871", kind: "station" },
  { id: "tobias-fornier", name: "Tobias Fornier Fire Station", municipality: "Tobias Fornier", phone: "09100945952", kind: "station" },
  { id: "valderrama", name: "Valderrama Fire Station", municipality: "Valderrama", phone: "09069098316", kind: "station" },
  { id: "provincial", name: "Office of the Provincial Fire Marshal", municipality: "Antique", phone: "09177144004", kind: "provincial" },
];

export const PROVINCIAL_FIRE_MARSHAL = BFP_HOTLINES.find((hotline) => hotline.kind === "provincial")!;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

/** The main station for a municipality name, tolerant of case, spacing and "San Jose" shorthand. */
export function hotlineForMunicipality(municipality: string | null | undefined): BfpHotline | null {
  if (!municipality) return null;
  const key = normalize(municipality);
  if (!key) return null;
  const stations = BFP_HOTLINES.filter((hotline) => hotline.kind === "station");
  return stations.find((hotline) => normalize(hotline.municipality) === key)
    ?? stations.find((hotline) => key.startsWith(normalize(hotline.municipality)) || normalize(hotline.municipality).startsWith(key))
    ?? null;
}

/** "0918 520 9634" */
export function formatHotline(phone: string) {
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}

/** tel: link in international form, which works on any SIM. */
export function hotlineHref(phone: string) {
  return `tel:+63${phone.slice(1)}`;
}
