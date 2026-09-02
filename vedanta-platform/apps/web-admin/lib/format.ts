export const fmt = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", opts);
export const nights = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 86400000);
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(+d)) return iso;
  d.setDate(d.getDate() + n);
  return Number.isNaN(+d) ? iso : d.toISOString().slice(0, 10);
};
