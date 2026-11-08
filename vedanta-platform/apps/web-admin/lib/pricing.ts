import type { Group } from "@/lib/data";
import { nights } from "@/lib/format";
export const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
/** Same rule as the API: agreed total wins; else package/agreed per-person prices × guests (× nights for nightly). */
export function bookingValue(g: Group): { value: number | null; how: string } {
  if (g.agreedTotal != null) return { value: Number(g.agreedTotal), how: "agreed total" };
  const p = g.packageInfo; if (!p) return { value: null, how: "no package chosen" };
  const twin = g.agreedTwin ?? p.price_twin; const single = g.agreedSingle ?? p.price_single;
  if (p.price_basis === "FIXED") return twin == null ? { value: null, how: "no price" } : { value: Number(twin), how: "fixed price" };
  const guests = g.guests ?? 0; const singles = Math.min(guests, g.singles ?? 0); const n = Math.max(1, nights(g.arrival, g.departure));
  const per = (guests - singles) * Number(twin ?? 0) + singles * Number(single ?? twin ?? 0);
  const v = p.price_basis === "PER_PERSON_PER_NIGHT" ? per * n : per;
  return { value: v, how: `${guests - singles} × ${gbp(Number(twin ?? 0))}${singles ? ` + ${singles} single × ${gbp(Number(single ?? twin ?? 0))}` : ""}${p.price_basis === "PER_PERSON_PER_NIGHT" ? ` × ${n} nights` : ""}` };
}
