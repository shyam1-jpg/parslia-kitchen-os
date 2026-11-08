export type TipMethod = "EVEN" | "HOURS" | "RATE";
export type TipStaff = { userId: string; hours: number };

function round2(n: number) { return Math.round(n * 100) / 100; }

/**
 * Priority rate (pence/pounds per hour) is paid first from the pot.
 * What remains is split evenly or by hours. Manual pounds are applied last.
 */
export function splitTips(opts: {
  total: number;
  ratePerHour: number;
  method: TipMethod;
  staff: TipStaff[];
  manual?: Record<string, number>;
}): { userId: string; hours: number; guaranteed: number; pool: number; manual: number; share: number }[] {
  const staff = opts.staff.filter(s => s.hours >= 0);
  const n = staff.length;
  if (!n) return [];
  const totalHours = staff.reduce((a, s) => a + s.hours, 0);
  let guaranteed = staff.map(s => ({ userId: s.userId, hours: s.hours, guaranteed: round2(s.hours * (opts.ratePerHour || 0)) }));
  let used = guaranteed.reduce((a, s) => a + s.guaranteed, 0);
  if (used > opts.total && used > 0) {
    const scale = opts.total / used;
    guaranteed = guaranteed.map(s => ({ ...s, guaranteed: round2(s.guaranteed * scale) }));
    used = guaranteed.reduce((a, s) => a + s.guaranteed, 0);
  }
  const remainder = round2(Math.max(0, opts.total - used));
  return guaranteed.map(s => {
    let pool = 0;
    if (opts.method === "EVEN") pool = remainder / n;
    else if (totalHours > 0) pool = remainder * (s.hours / totalHours);
    pool = round2(pool);
    const manual = round2(opts.manual?.[s.userId] ?? 0);
    return { ...s, pool, manual, share: round2(s.guaranteed + pool + manual) };
  });
}
