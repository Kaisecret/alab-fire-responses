// The resident's address, built from the sign-up dropdowns instead of typed
// twice: "Purok 3, Brgy. Poblacion, Hamtic, Antique (near the chapel)".

const MAX_LENGTH = 200;

function part(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function composeResidentAddress({ sitio, barangay, municipality, landmark }) {
  const brgy = part(barangay);
  const town = part(municipality);
  if (!brgy || !town) return "";
  const base = [part(sitio), `Brgy. ${brgy}`, town, "Antique"].filter(Boolean).join(", ");
  const near = part(landmark);
  const full = near ? `${base} (near ${near})` : base;
  return full.length <= MAX_LENGTH ? full : base.slice(0, MAX_LENGTH);
}
