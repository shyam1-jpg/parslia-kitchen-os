/** What guests may see. House notes, private "booking" holds and HOLDs stay off the public list. */

const HIDDEN_LINE = /^(paid|tbc|tba|\(?vacating.*\)?|5%\s+increase.*)$/i;

/**
 * A pattern that matches a name that looks like a private individual rather
 * than a public retreat/event/organisation. These are kept off the public
 * programme list for GDPR reasons — the house can see all bookings.
 *
 * Heuristic: a single capitalised word or "Firstname Surname" with no other
 * event words (retreat, yoga, immersion, conference, etc.) is treated as
 * private. This is conservative — when in doubt we hide, not show.
 */
const EVENT_WORDS = /retreat|yoga|immersion|conference|programme|workshop|seminar|festival|summit|hackathon|leadership|residential|camp|mentorship|circle|sangha|meditation|collective|academy|institute|inc\b|ltd\b|llc\b|school|university|college|society|trust|foundation|initiative|gita|kirtan|oms?\b|dojo|studio|centre|center/i;

export function isPublicProgrammeName(name: string): boolean {
  const n = cleanName(name);
  if (!n) return false;
  if (/^hold\b/i.test(n)) return false;
  if (/\bbooking\b/i.test(n)) return false;
  if (/^option\s+for\b/i.test(n)) return false;
  // Has event/organisation words → show
  if (EVENT_WORDS.test(n)) return true;
  // Multi-word name where every word is capitalised → likely a person → hide
  const words = n.split(/\s+/).filter(Boolean);
  const allCapped = words.every(w => /^[A-Z][a-z]/.test(w) || /^[A-Z]+$/.test(w));
  if (allCapped && words.length >= 2 && words.length <= 4) return false;
  // Single word that looks like a person surname → hide
  if (words.length === 1 && /^[A-Z][a-z]+$/.test(words[0])) return false;
  return true;
}

/** Public display name — strip initials/brackets that identify an individual */
export function publicProgrammeName(name: string, kind: string): string {
  const n = cleanName(name);
  // Remove trailing " (Name)" personal attribution in brackets
  const stripped = n.replace(/\s*\([A-Z][a-z]+\)\s*$/, "").trim();
  return stripped || kind;
}

export function cleanName(name: string): string {
  return String(name ?? "").replace(/\s+/g, " ").trim();
}

export function programmeKind(retreatType: string): string {
  if (retreatType === "day_retreat") return "Day retreat";
  if (retreatType === "residential") return "Residential retreat";
  return cleanName(retreatType.replace(/_/g, " "));
}

export function programmeBasis(useBasis: string | null | undefined): string | null {
  if (useBasis === "EXCLUSIVE") return "Exclusive use of the house";
  if (useBasis === "SHARED") return "Shared with other guests";
  return null;
}

export function guestCopy(text: string | null | undefined): string {
  return String(text ?? "")
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(l => l && !HIDDEN_LINE.test(l) && !/^organisers?\b/i.test(l))
    .join("\n");
}

export function nightsBetween(arrival: string, departure: string): number {
  const a = Date.parse(arrival);
  const d = Date.parse(departure);
  if (!Number.isFinite(a) || !Number.isFinite(d) || d < a) return 0;
  return Math.round((d - a) / 86_400_000);
}
