// Compares the name a resident typed with the name read from their ID.
// Tolerates case, spacing, accents, punctuation, suffixes, "Ma." for Maria,
// extra middle names and middle initials; the surname must still match.

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
const ALIASES = { ma: "maria", sto: "santo", sta: "santa" };

export function nameTokens(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !SUFFIXES.has(token))
    .map((token) => ALIASES[token] ?? token);
}

/** Stable key for a registered name, e.g. "juan|dela cruz". */
export function registeredNameKey(firstName, lastName) {
  return `${nameTokens(firstName).join(" ")}|${nameTokens(lastName).join(" ")}`;
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/** Equal, or one character off for longer names (a typo or a misread letter). */
function sameWord(a, b) {
  return a === b || (Math.min(a.length, b.length) >= 5 && editDistance(a, b) <= 1);
}

/** Splits "DELA CRUZ, JUAN SANTOS" style names when the ID gives no fields. */
function idNameParts(id) {
  let last = nameTokens(id?.lastName);
  let given = [...nameTokens(id?.firstName), ...nameTokens(id?.middleName)];
  const fullName = String(id?.fullName ?? "");
  const all = nameTokens(fullName);
  if (!last.length && fullName.includes(",")) {
    const [before, after] = fullName.split(",", 2);
    last = nameTokens(before);
    if (!given.length) given = nameTokens(after);
  }
  if (!given.length) given = all.filter((token) => !last.includes(token));
  return { last, given, all };
}

export function matchRegisteredName(registered, id) {
  const first = nameTokens(registered?.firstName);
  const last = nameTokens(registered?.lastName);
  const parts = idNameParts(id);
  if (!first.length || !last.length || (!parts.all.length && !parts.last.length && !parts.given.length)) {
    return { match: false, reason: "NO_NAME" };
  }

  const registeredSurname = last.join("");
  const surnameMatches = parts.last.length
    ? sameWord(registeredSurname, parts.last.join(""))
    : sameWord(registeredSurname, parts.all.slice(-last.length).join(""));
  if (!surnameMatches) return { match: false, reason: "LAST_NAME" };

  const given = parts.given.length ? parts.given : parts.all;
  if (!first.some((token) => token.length > 1)) return { match: false, reason: "FIRST_NAME" };
  for (const token of first) {
    const found = token.length === 1
      ? given.some((word) => word.startsWith(token))
      : given.some((word) => sameWord(token, word));
    if (!found) return { match: false, reason: "FIRST_NAME" };
  }
  return { match: true, reason: null };
}
