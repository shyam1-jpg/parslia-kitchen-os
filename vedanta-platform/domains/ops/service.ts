/** Front-of-house service: daily round, infused-water week, suppliers. */

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type WaterRecipe = {
  weekday: Weekday;
  title: string;
  method: string;
  ingredients: { name: string; qty: string; from: "kitchen" | "foh" | "suma" | "organic_wholesale" }[];
};

export type Supplier = { code: string; name: string; supplies: string; note: string };

export const FOH_SUPPLIERS: Supplier[] = [
  { code: "kitchen", name: "The kitchen", supplies: "Fruit, bananas, dairy and plant milks, coffee", note: "Order a day ahead so mise en place can include FOH." },
  { code: "walkers", name: "Walkers", supplies: "Shortbread and house biscuits", note: "Keep a full tin on the welcome sideboard." },
  { code: "nairns", name: "Nairn's", supplies: "Gluten-free oat biscuits", note: "Always a labelled gluten-free tin beside the Walkers." },
  { code: "suma", name: "Suma", supplies: "Herbal teabags", note: "Camomile, peppermint, fennel and the house herbal mix." },
  { code: "organic_wholesale", name: "Organic wholesale", supplies: "Loose teas and herbal", note: "Caddies on the tea tray — black, green, and loose herbal." },
];

export const WATER_WEEK: WaterRecipe[] = [
  { weekday: "Monday", title: "Lemon and mint water", method: "Slice two lemons. Bruise a handful of mint. Cover with cold water in the glass urn. Ice just before service.", ingredients: [{ name: "Lemons", qty: "2", from: "kitchen" }, { name: "Fresh mint", qty: "1 bunch", from: "kitchen" }] },
  { weekday: "Tuesday", title: "Cucumber and lime water", method: "Ribbon half a cucumber. Add one lime, thinly sliced. Cold water, no sugar.", ingredients: [{ name: "Cucumber", qty: "1", from: "kitchen" }, { name: "Limes", qty: "2", from: "kitchen" }] },
  { weekday: "Wednesday", title: "Orange and rosemary water", method: "Three oranges, one sprig of rosemary. Let it sit twenty minutes before pouring.", ingredients: [{ name: "Oranges", qty: "3", from: "kitchen" }, { name: "Rosemary", qty: "1 sprig", from: "kitchen" }] },
  { weekday: "Thursday", title: "Ginger and lemon water", method: "Thumb of ginger, sliced. One lemon. Especially good on cooler mornings.", ingredients: [{ name: "Ginger", qty: "1 thumb", from: "kitchen" }, { name: "Lemons", qty: "1", from: "kitchen" }] },
  { weekday: "Friday", title: "Berry and mint water", method: "A handful of mixed berries, lightly crushed, with mint. Strain if the urn looks cloudy.", ingredients: [{ name: "Mixed berries", qty: "1 punnet", from: "kitchen" }, { name: "Fresh mint", qty: "1 small bunch", from: "kitchen" }] },
  { weekday: "Saturday", title: "Apple and cinnamon water", method: "Two eating apples, cored and sliced. One cinnamon stick. No boiled spice — cold infusion only.", ingredients: [{ name: "Eating apples", qty: "2", from: "kitchen" }, { name: "Cinnamon stick", qty: "1", from: "kitchen" }] },
  { weekday: "Sunday", title: "Grapefruit and basil water", method: "One pink grapefruit, a few basil leaves. Refresh the urn at lunch if it has gone bitter.", ingredients: [{ name: "Grapefruit", qty: "1", from: "kitchen" }, { name: "Basil", qty: "1 small bunch", from: "kitchen" }] },
];

export const FOH_NINE_AM = [
  "09:00 Clean the coffee machines",
  "09:00 Empty the coffee-machine filters and put them on to clean",
  "Collect dirty cups, take them to the wash",
  "Return clean cups to the restaurant",
  "Fresh Walkers biscuits on the sideboard",
  "Gluten-free Nairn's biscuits labelled and full",
  "Check plant-based milks (oat and soya/almond)",
  "Check dairy milk and bananas with the kitchen",
  "Restock Suma herbal teas and organic-wholesale loose teas",
  "Make today's infused water (see Front desk recipe)",
];

export function londonWeekday(isoDate: string): Weekday {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = utc.getUTCDay(); // 0 Sun
  return WEEKDAYS[dow === 0 ? 6 : dow - 1];
}

export function recipeForDate(isoDate: string, recipes: WaterRecipe[] = WATER_WEEK): WaterRecipe {
  const day = londonWeekday(isoDate);
  return recipes.find(r => r.weekday === day) ?? recipes[0];
}

export function nextDayIso(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + 1, 12));
  return utc.toISOString().slice(0, 10);
}

export function supplierLabel(code: string): string {
  return FOH_SUPPLIERS.find(s => s.code === code)?.name ?? code;
}
