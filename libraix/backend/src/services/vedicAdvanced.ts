/**
 * Super-advanced Vedic detail layer for LibriaX charts.
 * Navamsa (D9), Vedic drishti, pratyantardasha, combustion, retrograde,
 * gochara/transits, friendship, and extra yoga screens — computed from
 * Lahiri sidereal longitudes without extra npm dependencies.
 */

import { calculateVedic } from "natalengine";
import type { AntardashaPeriod, ChartPlanetRow, ChartYoga } from "./horoscopeChart.js";

const RASHI_NAMES = [
  "Mesha",
  "Vrishabha",
  "Mithuna",
  "Karka",
  "Simha",
  "Kanya",
  "Tula",
  "Vrishchika",
  "Dhanu",
  "Makara",
  "Kumbha",
  "Meena",
] as const;

const RASHI_WESTERN = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

/** Classical combustion orbs (degrees from Sun). */
const COMBUSTION_ORB: Record<string, number> = {
  moon: 12,
  mars: 17,
  mercury: 14,
  jupiter: 11,
  venus: 10,
  saturn: 15,
};

/** Natural friendship: 1 friend, 0 neutral, -1 enemy */
const NATURAL_FRIENDSHIP: Record<string, Record<string, number>> = {
  sun: { moon: 1, mars: 1, mercury: 0, jupiter: 1, venus: -1, saturn: -1 },
  moon: { sun: 1, mars: 0, mercury: 1, jupiter: 0, venus: 0, saturn: 0 },
  mars: { sun: 1, moon: 1, mercury: -1, jupiter: 1, venus: 0, saturn: 0 },
  mercury: { sun: 1, moon: -1, mars: 0, jupiter: 0, venus: 1, saturn: 0 },
  jupiter: { sun: 1, moon: 1, mars: 1, mercury: -1, venus: -1, saturn: 0 },
  venus: { sun: -1, moon: -1, mars: 0, mercury: 1, jupiter: 0, saturn: 1 },
  saturn: { sun: -1, moon: -1, mars: -1, mercury: 1, jupiter: 0, venus: 1 },
};

export interface PratyantardashaPeriod {
  mahaLord: string;
  antarLord: string;
  lord: string;
  startDate: string;
  endDate: string;
  years: number;
}

export interface NavamsaPlanet {
  id: string;
  name: string;
  short: string;
  rashi: string;
  rashiWestern: string;
  house: number | null;
  longitude: number;
  degree: string;
}

export interface NavamsaChart {
  lagna: { rashi: string; rashiWestern: string; degree: string } | null;
  planets: NavamsaPlanet[];
  houses: Array<{
    number: number;
    sign: string;
    signWestern: string;
    planets: Array<{ id: string; short: string }>;
  }>;
  note: string;
}

export interface VedicDrishti {
  from: string;
  to: string;
  houses: number;
  kind: string;
  summary: string;
}

export interface GocharaItem {
  planet: string;
  rashi: string;
  rashiWestern: string;
  houseFromLagna: number | null;
  houseFromMoon: number | null;
  note: string;
}

export interface GocharaReport {
  asOf: string;
  transitMoon: GocharaItem | null;
  keyTransits: GocharaItem[];
  sadeSati: {
    active: boolean;
    phase: "approaching" | "peak" | "leaving" | "none";
    summary: string;
  };
  note: string;
}

export interface PlanetFineDetail {
  id: string;
  degreeInSign: number;
  nakshatraProgress: number;
  nakshatraDeity: string | null;
  nakshatraSymbol: string | null;
  retrograde: boolean;
  combust: boolean;
  combustionOrb: number | null;
  naturalFriends: string[];
  naturalEnemies: string[];
}

function normalizeAngle(deg: number): number {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

function angularDistance(a: number, b: number): number {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(d, 360 - d);
}

function formatDegreeInSign(longitude: number): string {
  const within = longitude % 30;
  const d = Math.floor(within);
  const m = Math.round((within - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}'`;
}

function rashiIndexFromLongitude(lon: number): number {
  return Math.floor(normalizeAngle(lon) / 30); // 0–11
}

/**
 * Navamsa (D9): each 3°20' of a sign maps to a navamsa rashi.
 * Odd signs start from Mesha; even signs from Tula (standard Parashari).
 */
export function navamsaRashiIndex(siderealLongitude: number): number {
  const lon = normalizeAngle(siderealLongitude);
  const sign = Math.floor(lon / 30); // 0–11
  const within = lon % 30;
  const pada = Math.min(8, Math.floor(within / (30 / 9))); // 0–8
  const odd = sign % 2 === 0; // Mesha=0 odd in 1-based; 0-based even index = odd sign
  const start = odd ? 0 : 6; // Mesha or Tula
  return (start + pada) % 12;
}

export function buildNavamsaChart(planets: ChartPlanetRow[], lagnaLongitude: number | null): NavamsaChart {
  const lagnaIdx = lagnaLongitude != null ? navamsaRashiIndex(lagnaLongitude) : null;
  const navPlanets: NavamsaPlanet[] = planets
    .filter((p) => p.id !== "ascendant")
    .map((p) => {
      const idx = navamsaRashiIndex(p.longitude);
      const house = lagnaIdx != null ? ((idx - lagnaIdx + 12) % 12) + 1 : null;
      return {
        id: p.id,
        name: p.name,
        short: p.short,
        rashi: RASHI_NAMES[idx]!,
        rashiWestern: RASHI_WESTERN[idx]!,
        house,
        longitude: p.longitude,
        degree: formatDegreeInSign(p.longitude),
      };
    });

  const houses =
    lagnaIdx == null
      ? []
      : Array.from({ length: 12 }, (_, i) => {
          const signIdx = (lagnaIdx + i) % 12;
          return {
            number: i + 1,
            sign: RASHI_NAMES[signIdx]!,
            signWestern: RASHI_WESTERN[signIdx]!,
            planets: navPlanets.filter((p) => p.house === i + 1).map((p) => ({ id: p.id, short: p.short })),
          };
        });

  return {
    lagna:
      lagnaIdx != null
        ? {
            rashi: RASHI_NAMES[lagnaIdx]!,
            rashiWestern: RASHI_WESTERN[lagnaIdx]!,
            degree: lagnaLongitude != null ? formatDegreeInSign(lagnaLongitude) : "—",
          }
        : null,
    planets: navPlanets,
    houses,
    note: "Navamsa (D-9) — marriage, dharma, and spouse themes. Whole-sign from D9 Lagna.",
  };
}

/** Classical graha drishti (whole-sign counts from the aspecting planet). */
export function buildVedicDrishti(planets: ChartPlanetRow[]): VedicDrishti[] {
  const byId = Object.fromEntries(planets.filter((p) => p.house != null).map((p) => [p.id, p]));
  const special: Record<string, number[]> = {
    mars: [4, 7, 8],
    jupiter: [5, 7, 9],
    saturn: [3, 7, 10],
  };
  const out: VedicDrishti[] = [];
  const aspectors = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];

  for (const fromId of aspectors) {
    const from = byId[fromId];
    if (!from?.house) continue;
    const targets = special[fromId] ?? [7];
    for (const step of targets) {
      const targetHouse = ((from.house - 1 + (step - 1)) % 12) + 1;
      for (const to of planets) {
        if (!to.house || to.id === fromId || to.id === "ascendant") continue;
        if (to.house !== targetHouse) continue;
        const kind = step === 7 ? "7th (full)" : `${step}th special`;
        out.push({
          from: from.name,
          to: to.name,
          houses: step,
          kind,
          summary: `${from.name} aspects ${to.name} by ${kind} drishti (H${from.house} → H${to.house}).`,
        });
      }
    }
  }
  return out.slice(0, 40);
}

function addFractionalYears(start: Date, years: number): Date {
  return new Date(start.getTime() + years * 365.25 * 24 * 60 * 60 * 1000);
}

export function buildPratyantardashas(antar: AntardashaPeriod): PratyantardashaPeriod[] {
  const startIdx = DASHA_ORDER.indexOf(antar.lord as (typeof DASHA_ORDER)[number]);
  if (startIdx < 0) return [];
  const antarYears = antar.years;
  const out: PratyantardashaPeriod[] = [];
  let cursor = new Date(antar.startDate);
  const antarEnd = new Date(antar.endDate);
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(startIdx + i) % 9]!;
    const years = (antarYears * (DASHA_YEARS[lord] ?? 0)) / 120;
    let end = addFractionalYears(cursor, years);
    if (end > antarEnd) end = new Date(antarEnd);
    if (cursor >= antarEnd) break;
    out.push({
      mahaLord: antar.mahaLord,
      antarLord: antar.lord,
      lord,
      startDate: cursor.toISOString(),
      endDate: end.toISOString(),
      years: Math.round(years * 10000) / 10000,
    });
    cursor = end;
  }
  return out;
}

export function currentPratyantardasha(
  periods: PratyantardashaPeriod[],
  at: Date = new Date(),
): PratyantardashaPeriod | null {
  for (const p of periods) {
    const s = new Date(p.startDate).getTime();
    const e = new Date(p.endDate).getTime();
    if (at.getTime() >= s && at.getTime() < e) return p;
  }
  return periods[periods.length - 1] ?? null;
}

export function enrichPlanetDetails(
  planets: ChartPlanetRow[],
  rawPositions: Record<string, { longitude?: number; nakshatra?: { deity?: string; symbol?: string; degreeInNakshatra?: number }; rashi?: { degreeInSign?: number } }>,
  dayLaterLongitudes: Record<string, number>,
): PlanetFineDetail[] {
  const sun = planets.find((p) => p.id === "sun");
  return planets
    .filter((p) => p.id !== "ascendant")
    .map((p) => {
      const raw = rawPositions[p.id];
      const degreeInSign = raw?.rashi?.degreeInSign ?? p.longitude % 30;
      const degInNak = raw?.nakshatra?.degreeInNakshatra ?? 0;
      const nakProgress = Math.round((degInNak / (360 / 27)) * 1000) / 10;
      const later = dayLaterLongitudes[p.id];
      const retrograde =
        later != null && p.id !== "rahu" && p.id !== "ketu" ? normalizeAngle(later) < normalizeAngle(p.longitude) - 0.01 : false;
      // Nodes always reverse in tropical; for sidereal mean/true node treat as retrograde-flavoured
      const nodeRetro = p.id === "rahu" || p.id === "ketu";
      let combust = false;
      let combustionOrb: number | null = null;
      if (sun && COMBUSTION_ORB[p.id] != null) {
        combustionOrb = Math.round(angularDistance(p.longitude, sun.longitude) * 100) / 100;
        combust = combustionOrb <= (COMBUSTION_ORB[p.id] ?? 0);
      }
      const friends: string[] = [];
      const enemies: string[] = [];
      const row = NATURAL_FRIENDSHIP[p.id];
      if (row) {
        for (const [other, rel] of Object.entries(row)) {
          if (rel === 1) friends.push(other[0]!.toUpperCase() + other.slice(1));
          if (rel === -1) enemies.push(other[0]!.toUpperCase() + other.slice(1));
        }
      }
      return {
        id: p.id,
        degreeInSign: Math.round(degreeInSign * 100) / 100,
        nakshatraProgress: nakProgress,
        nakshatraDeity: raw?.nakshatra?.deity ?? null,
        nakshatraSymbol: raw?.nakshatra?.symbol ?? null,
        retrograde: retrograde || nodeRetro,
        combust,
        combustionOrb,
        naturalFriends: friends,
        naturalEnemies: enemies,
      };
    });
}

export function detectAdvancedYogas(planets: ChartPlanetRow[], houseOf: Record<string, number>): ChartYoga[] {
  const yogas: ChartYoga[] = [];
  const moonH = houseOf.moon;
  const sunH = houseOf.sun;

  // Kemadruma: Moon alone — no planets in 2nd/12th from Moon (excl nodes sometimes)
  const classical = ["sun", "mars", "mercury", "jupiter", "venus", "saturn"];
  let kemadruma = false;
  if (moonH != null) {
    const h2 = (moonH % 12) + 1;
    const h12 = ((moonH + 10) % 12) + 1;
    const neighbors = classical.some((id) => houseOf[id] === h2 || houseOf[id] === h12);
    const withMoon = classical.some((id) => houseOf[id] === moonH);
    kemadruma = !neighbors && !withMoon;
  }
  yogas.push({
    id: "kemadruma",
    name: "Kemadruma Yoga",
    present: kemadruma,
    severity: kemadruma ? "caution" : "info",
    summary: kemadruma
      ? "Moon has no classical planets in the 2nd/12th — Kemadruma-like isolation."
      : "Moon has planetary support in adjacent houses (no Kemadruma).",
    detail: "Softened if Moon is in kendra or with benefics — full chart judgment required.",
  });

  // Parivartana: mutual exchange of signs (lords swap houses via sign ownership)
  const lordOfSign: Record<string, string> = {
    Mesha: "mars",
    Vrishabha: "venus",
    Mithuna: "mercury",
    Karka: "moon",
    Simha: "sun",
    Kanya: "mercury",
    Tula: "venus",
    Vrishchika: "mars",
    Dhanu: "jupiter",
    Makara: "saturn",
    Kumbha: "saturn",
    Meena: "jupiter",
  };
  let parivartana = false;
  let pariDetail = "";
  const list = planets.filter((p) => !["rahu", "ketu", "ascendant"].includes(p.id));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      if (lordOfSign[a.rashi] === b.id && lordOfSign[b.rashi] === a.id) {
        parivartana = true;
        pariDetail = `${a.name} in ${b.name}'s sign and ${b.name} in ${a.name}'s sign`;
      }
    }
  }
  yogas.push({
    id: "parivartana",
    name: "Parivartana Yoga",
    present: parivartana,
    severity: "notable",
    summary: parivartana ? `${pariDetail} — mutual exchange.` : "No mutual sign exchange between classical planets.",
    detail: "Parivartana links the two house themes strongly for life.",
  });

  // Neecha Bhanga hint: debilitated planet in kendra from Lagna or Moon
  const debil = planets.filter((p) => p.dignity === "Debilitated" && p.house != null);
  const kendra = new Set([1, 4, 7, 10]);
  const neecha = debil.filter((p) => kendra.has(p.house!) || (moonH != null && kendra.has(((p.house! - moonH + 12) % 12) + 1)));
  yogas.push({
    id: "neechabhanga",
    name: "Neecha Bhanga hint",
    present: neecha.length > 0,
    severity: "notable",
    summary:
      neecha.length > 0
        ? `${neecha.map((p) => p.name).join(", ")} debilitated but in kendra from Lagna/Moon — cancellation flavour.`
        : "No simple Neecha Bhanga (debilitated-in-kendra) hint.",
    detail: "Full Neecha Bhanga Raja Yoga has multiple classical conditions; this is a geometric screen.",
  });

  // Budha-Aditya already elsewhere; add Shasha-like already in mahapurusha
  // Vipareeta Raja: dusthana lords in dusthana
  const dusthana = new Set([6, 8, 12]);
  // Approximate via planets in 6/8/12 that rule 6/8/12 — simplified: 2+ planets in dusthanas with dignity own/exalt
  const dustPlanets = planets.filter((p) => p.house != null && dusthana.has(p.house) && (p.dignity === "Own sign" || p.dignity === "Exalted"));
  yogas.push({
    id: "vipareeta-hint",
    name: "Vipareeta strength hint",
    present: dustPlanets.length >= 1,
    severity: "notable",
    summary:
      dustPlanets.length >= 1
        ? `${dustPlanets.map((p) => `${p.name} H${p.house}`).join(", ")} strong in dusthana — transformative/victory theme.`
        : "No strong planet-in-dusthana dignity hint.",
    detail: "True Vipareeta Raja Yoga needs dusthana lords placed in dusthanas — verify with house lords.",
  });

  // Chandra-Mangal already exists; add Amala: benefic in 10th from Moon or Lagna
  const benefics = ["jupiter", "venus", "mercury", "moon"];
  const tenthFromLagna = 10;
  const tenthFromMoon = moonH != null ? ((moonH + 8) % 12) + 1 : null;
  const amala = planets.some(
    (p) =>
      benefics.includes(p.id) &&
      p.house != null &&
      (p.house === tenthFromLagna || (tenthFromMoon != null && p.house === tenthFromMoon)),
  );
  yogas.push({
    id: "amala",
    name: "Amala Yoga hint",
    present: amala,
    severity: "notable",
    summary: amala
      ? "Benefic in the 10th from Lagna or Moon — reputation / clean karma flavour."
      : "No benefic in 10th from Lagna/Moon.",
    detail: "Amala supports public image and righteous action themes.",
  });

  void sunH;
  return yogas;
}

export async function buildGochara(opts: {
  natalMoonHouse: number | null;
  natalLagnaRashiIndex: number | null; // 0–11
  natalMoonRashiIndex: number | null;
  latitude: number;
  longitude: number;
  utcOffsetHours: number;
}): Promise<GocharaReport> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + opts.utcOffsetHours;
  // Use noon local-ish for stable daily transit snapshot
  const transitHour = 12;
  let transit: ReturnType<typeof calculateVedic> | null = null;
  try {
    transit = calculateVedic(date, transitHour, opts.utcOffsetHours, opts.latitude, opts.longitude);
  } catch {
    transit = null;
  }

  const asOf = now.toISOString();
  if (!transit) {
    return {
      asOf,
      transitMoon: null,
      keyTransits: [],
      sadeSati: { active: false, phase: "none", summary: "Transit snapshot unavailable." },
      note: "Gochara uses today's Lahiri positions at the birth location.",
    };
  }

  const toItem = (id: string, name: string): GocharaItem | null => {
    const pos = transit!.positions[id as keyof typeof transit.positions] as
      | { rashi: { name: string; westernName: string; index: number }; longitude: number }
      | undefined;
    if (!pos) return null;
    const signIdx = pos.rashi.index - 1;
    const houseFromLagna =
      opts.natalLagnaRashiIndex != null ? ((signIdx - opts.natalLagnaRashiIndex + 12) % 12) + 1 : null;
    const houseFromMoon =
      opts.natalMoonRashiIndex != null ? ((signIdx - opts.natalMoonRashiIndex + 12) % 12) + 1 : null;
    return {
      planet: name,
      rashi: pos.rashi.name,
      rashiWestern: pos.rashi.westernName,
      houseFromLagna,
      houseFromMoon,
      note: houseFromLagna ? `Transit ${name} in H${houseFromLagna} from natal Lagna` : `Transit ${name} in ${pos.rashi.westernName}`,
    };
  };

  const transitMoon = toItem("moon", "Moon");
  const keyTransits = ["sun", "mars", "mercury", "jupiter", "venus", "saturn", "rahu"]
    .map((id) => toItem(id, id[0]!.toUpperCase() + id.slice(1)))
    .filter((x): x is GocharaItem => !!x);

  const sat = keyTransits.find((t) => t.planet === "Saturn");
  let sadeSati: GocharaReport["sadeSati"] = {
    active: false,
    phase: "none",
    summary: "Saturn is not in the classic Sade Sati zone from natal Moon.",
  };
  if (sat?.houseFromMoon != null) {
    const h = sat.houseFromMoon;
    if (h === 12) {
      sadeSati = { active: true, phase: "approaching", summary: "Saturn 12th from natal Moon — Sade Sati rising phase." };
    } else if (h === 1) {
      sadeSati = { active: true, phase: "peak", summary: "Saturn over natal Moon — Sade Sati peak phase." };
    } else if (h === 2) {
      sadeSati = { active: true, phase: "leaving", summary: "Saturn 2nd from natal Moon — Sade Sati leaving phase." };
    }
  }

  void opts.natalMoonHouse;
  return {
    asOf,
    transitMoon,
    keyTransits,
    sadeSati,
    note: "Daily gochara snapshot (Lahiri) relative to natal Lagna and Moon. Timing flavour — not medical/financial advice.",
  };
}

export function dayLaterLongitudes(
  date: string,
  birthHour: number,
  utcOffset: number,
  lat: number,
  lon: number,
): Record<string, number> {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + 1));
  const nextDate = next.toISOString().slice(0, 10);
  try {
    const raw = calculateVedic(nextDate, birthHour, utcOffset, lat, lon);
    const out: Record<string, number> = {};
    for (const [id, pos] of Object.entries(raw.positions)) {
      if (pos && typeof (pos as { longitude?: number }).longitude === "number") {
        out[id] = (pos as { longitude: number }).longitude;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function advancedReadingAppendix(opts: {
  navamsa: NavamsaChart;
  drishti: VedicDrishti[];
  pratyantar: PratyantardashaPeriod | null;
  gochara: GocharaReport;
  planetDetails: PlanetFineDetail[];
}): string {
  const lines: string[] = ["ADVANCED VEDIC DETAIL LAYER:"];
  if (opts.navamsa.lagna) {
    lines.push(`Navamsa (D9) Lagna: ${opts.navamsa.lagna.rashi}/${opts.navamsa.lagna.rashiWestern}`);
    for (const p of opts.navamsa.planets.slice(0, 9)) {
      lines.push(`- D9 ${p.name}: ${p.rashi}/${p.rashiWestern}${p.house ? ` H${p.house}` : ""}`);
    }
  }
  if (opts.pratyantar) {
    lines.push(
      `Current Pratyantardasha: ${opts.pratyantar.mahaLord}–${opts.pratyantar.antarLord}–${opts.pratyantar.lord} (${opts.pratyantar.startDate.slice(0, 10)} → ${opts.pratyantar.endDate.slice(0, 10)})`,
    );
  }
  const combust = opts.planetDetails.filter((p) => p.combust).map((p) => p.id);
  const retro = opts.planetDetails.filter((p) => p.retrograde).map((p) => p.id);
  if (combust.length) lines.push(`Combust: ${combust.join(", ")}`);
  if (retro.length) lines.push(`Retrograde: ${retro.join(", ")}`);
  if (opts.drishti.length) {
    lines.push("Vedic drishti (sample):");
    for (const d of opts.drishti.slice(0, 10)) lines.push(`- ${d.summary}`);
  }
  if (opts.gochara.transitMoon) {
    lines.push(
      `Transit Moon: ${opts.gochara.transitMoon.rashiWestern}${opts.gochara.transitMoon.houseFromLagna ? ` H${opts.gochara.transitMoon.houseFromLagna} from Lagna` : ""}`,
    );
  }
  lines.push(`Sade Sati: ${opts.gochara.sadeSati.summary}`);
  for (const t of opts.gochara.keyTransits.filter((x) => ["Jupiter", "Saturn", "Rahu"].includes(x.planet))) {
    lines.push(`- ${t.note} (${t.rashiWestern})`);
  }
  return lines.join("\n");
}

