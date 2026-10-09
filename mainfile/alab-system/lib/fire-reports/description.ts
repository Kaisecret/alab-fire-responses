// Residents report the scene by choices, not in writing, so a resident report
// has no description. Older reports stored a placeholder sentence instead;
// it is treated as no description so screens do not show it.
const PLACEHOLDERS = new Set(["no description provided.", "no description provided"]);

/** The report's own written description, or null when there is none. */
export function reportDescription(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text && !PLACEHOLDERS.has(text.toLowerCase()) ? text : null;
}
