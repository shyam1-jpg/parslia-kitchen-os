/** House payroll from Vedanta clock punches. Kiteline rota/PINs stay on Kiteline. */
import { type Punch } from "./hours.ts";

export type Shift = { inAt: Date; outAt: Date | null; hours: number };

export function shiftsFromPunches(punches: Punch[], now = new Date()): Shift[] {
  const ordered = [...punches].sort((a, b) => +a.at - +b.at);
  const out: Shift[] = [];
  let open: Date | null = null;
  for (const p of ordered) {
    if (p.kind === "IN") {
      if (!open) open = p.at;
      continue;
    }
    if (p.kind === "OUT" && open) {
      out.push({ inAt: open, outAt: p.at, hours: Math.round((+p.at - +open) / 36_000) / 100 });
      open = null;
    }
  }
  if (open) {
    out.push({ inAt: open, outAt: null, hours: Math.round(Math.max(0, +now - +open) / 36_000) / 100 });
  }
  return out;
}

export function payFromHours(hours: number, hourlyRate: number | null | undefined): number | null {
  if (hourlyRate == null || !(hourlyRate >= 0)) return null;
  return Math.round(hours * hourlyRate * 100) / 100;
}

export function weekStartMonday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - (day - 1));
  return utc.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + n, 12));
  return utc.toISOString().slice(0, 10);
}

export function payrollRow(input: {
  hours: number;
  hourlyRate: number | null;
  contractedHours: number | null;
}): { hours: number; pay: number | null; variance: number | null } {
  const hours = Math.round(input.hours * 100) / 100;
  const pay = payFromHours(hours, input.hourlyRate);
  const variance = input.contractedHours != null ? Math.round((hours - input.contractedHours) * 100) / 100 : null;
  return { hours, pay, variance };
}
