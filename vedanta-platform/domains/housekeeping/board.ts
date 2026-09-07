/** Housekeeping board helpers — status dots, stay kind, visit minutes. */

export function hkDot(status: string): { tone: "dirty" | "cleaning" | "clean" | "ready" | "occupied" | "ooo" | "unknown"; label: string } {
  if (status === "VACANT_DIRTY") return { tone: "dirty", label: "Dirty" };
  if (status === "CLEANING") return { tone: "cleaning", label: "Cleaning" };
  if (status === "VACANT_CLEAN") return { tone: "clean", label: "Clean" };
  if (status === "INSPECTED") return { tone: "ready", label: "Inspected" };
  if (status === "OCCUPIED") return { tone: "occupied", label: "Occupied" };
  if (status === "OUT_OF_ORDER" || status === "OUT_OF_SERVICE") return { tone: "ooo", label: status === "OUT_OF_ORDER" ? "Out of order" : "Out of service" };
  return { tone: "unknown", label: status || "—" };
}

export function stayKind(input: { occupied_last_night: boolean; occupied_tonight: boolean; here_this_morning?: boolean }): "departure" | "arrival" | "stayover" | "vacant" {
  if (input.occupied_last_night && !input.occupied_tonight) return "departure";
  if (!input.occupied_last_night && input.occupied_tonight) return "arrival";
  if (input.occupied_last_night && input.occupied_tonight) return "stayover";
  return "vacant";
}

export function visitMinutes(startedAt: Date | string | null | undefined, finishedAt: Date | string | null | undefined): number | null {
  if (!startedAt || !finishedAt) return null;
  const a = new Date(startedAt).getTime();
  const b = new Date(finishedAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 60_000);
}
