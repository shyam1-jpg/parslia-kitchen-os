/** What guests may see. House notes, private "booking" holds and HOLDs stay off the public list. */

const HIDDEN_LINE = /^(paid|tbc|tba|\(?vacating.*\)?|5%\s+increase.*)$/i;

export function isPublicProgrammeName(name: string): boolean {
  const n = cleanName(name);
  if (!n) return false;
  if (/^hold\b/i.test(n)) return false;
  if (/\bbooking\b/i.test(n)) return false;
  return true;
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
