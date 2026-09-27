/**
 * Normalizes user- or AI-provided natural date expressions into ISO YYYY-MM-DD.
 * Examples:
 * - "29 of sep" -> "2026-09-29"
 * - "29 of september" -> "2026-09-29"
 * - "sep 29" -> "2026-09-29"
 * - "29th of sep 2026" -> "2026-09-29"
 * - "tomorrow" -> tomorrow's YYYY-MM-DD
 * - "today" -> today's YYYY-MM-DD
 * - "2026-09-29" -> "2026-09-29"
 */
export function parseNaturalDate(input?: string | null): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayIso = now.toISOString().slice(0, 10);

  if (!input || typeof input !== "string" || !input.trim()) {
    return todayIso;
  }

  const clean = input.trim().toLowerCase();

  if (clean === "today") {
    return todayIso;
  }

  if (clean === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  if (clean === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // Already YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Month lookup dictionary
  const months: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  // Format 1: Day first -> e.g. "29 of sep", "29th of september", "29 sep 2026", "29-sep"
  const dayFirstMatch = clean.match(
    /^(\d{1,2})(?:st|nd|rd|th)?(?:\s+(?:of\s+)?)?([a-z]+)(?:\s+(\d{4}))?$/i
  );
  if (dayFirstMatch) {
    const day = parseInt(dayFirstMatch[1], 10);
    const monthKey = dayFirstMatch[2].toLowerCase();
    const year = dayFirstMatch[3] ? parseInt(dayFirstMatch[3], 10) : currentYear;
    if (months[monthKey] && day >= 1 && day <= 31) {
      const m = String(months[monthKey]).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      return `${year}-${m}-${d}`;
    }
  }

  // Format 2: Month first -> e.g. "sep 29", "september 29th", "sep 29 2026", "september 29, 2026"
  const monthFirstMatch = clean.match(
    /^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/i
  );
  if (monthFirstMatch) {
    const monthKey = monthFirstMatch[1].toLowerCase();
    const day = parseInt(monthFirstMatch[2], 10);
    const year = monthFirstMatch[3] ? parseInt(monthFirstMatch[3], 10) : currentYear;
    if (months[monthKey] && day >= 1 && day <= 31) {
      const m = String(months[monthKey]).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      return `${year}-${m}-${d}`;
    }
  }

  // Format 3: Substring search (e.g., "29 of sep" inside a sentence or prompt)
  const substrMatch = clean.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)/i);
  if (substrMatch) {
    const day = parseInt(substrMatch[1], 10);
    const monthKey = substrMatch[2].toLowerCase();
    if (months[monthKey] && day >= 1 && day <= 31) {
      const m = String(months[monthKey]).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      return `${currentYear}-${m}-${d}`;
    }
  }

  // Standard Date.parse fallback
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return todayIso;
}
