import { buildHoroscopeChart, type BirthDetailsInput, type HoroscopeChartResult } from "./horoscopeChart.js";
import {
  calculateAshtakoot,
  nakshatraNumberFromName,
  rashiNumberFromName,
  type AshtakootResult,
  type MatchPersonInput,
} from "./ashtakootMatch.js";

export interface HoroscopeMatchInput {
  personA: BirthDetailsInput;
  personB: BirthDetailsInput;
}

export interface AdvancedMatchLayer {
  navamsa: {
    lagnaA: string | null;
    lagnaB: string | null;
    sameNavamsaLagna: boolean;
    venusHouseA: number | null;
    venusHouseB: number | null;
    note: string;
  };
  seventhHouse: {
    signA: string | null;
    signB: string | null;
    lordA: string | null;
    lordB: string | null;
    planetsA: string[];
    planetsB: string[];
    note: string;
  };
  dashaOverlap: {
    mahaA: string | null;
    mahaB: string | null;
    antarA: string | null;
    antarB: string | null;
    note: string;
  };
  readingContext: string;
}

export interface HoroscopeMatchResult {
  match: AshtakootResult;
  advanced: AdvancedMatchLayer;
  personA: HoroscopeChartResult;
  personB: HoroscopeChartResult;
}

function manglikFlags(chart: HoroscopeChartResult): { fromLagna: boolean; fromMoon: boolean; marsHouse: number | null } {
  const mars = chart.planets.find((p) => p.id === "mars");
  const moon = chart.planets.find((p) => p.id === "moon");
  const marsHouse = mars?.house ?? null;
  const moonHouse = moon?.house ?? null;
  const manglikHouses = new Set([1, 4, 7, 8, 12]);
  const fromLagna = marsHouse != null && manglikHouses.has(marsHouse);
  const fromMoon =
    marsHouse != null &&
    moonHouse != null &&
    manglikHouses.has(((marsHouse - moonHouse + 12) % 12) + 1);
  return { fromLagna, fromMoon, marsHouse };
}

function toMatchPerson(chart: HoroscopeChartResult): MatchPersonInput {
  const nak =
    nakshatraNumberFromName(chart.moonSign.nakshatra) ??
    (() => {
      throw new Error("INVALID_NAKSHATRA");
    })();
  const rashi =
    rashiNumberFromName(chart.moonSign.rashiWestern) ??
    rashiNumberFromName(chart.moonSign.rashi) ??
    (() => {
      throw new Error("INVALID_RASHI");
    })();
  const manglik = manglikFlags(chart);
  return {
    name: chart.name ?? undefined,
    gender: (chart.gender as MatchPersonInput["gender"]) ?? "unspecified",
    nakshatra: nak,
    nakshatraName: chart.moonSign.nakshatra,
    pada: chart.moonSign.pada,
    rashi,
    rashiName: chart.moonSign.rashi,
    rashiWestern: chart.moonSign.rashiWestern,
    manglikFromLagna: manglik.fromLagna,
    manglikFromMoon: manglik.fromMoon,
    marsHouse: manglik.marsHouse,
  };
}

function buildAdvancedMatchLayer(a: HoroscopeChartResult, b: HoroscopeChartResult): AdvancedMatchLayer {
  const lagnaA = a.navamsa?.lagna ? `${a.navamsa.lagna.rashi}/${a.navamsa.lagna.rashiWestern}` : null;
  const lagnaB = b.navamsa?.lagna ? `${b.navamsa.lagna.rashi}/${b.navamsa.lagna.rashiWestern}` : null;
  const sameNavamsaLagna = !!(a.navamsa?.lagna && b.navamsa?.lagna && a.navamsa.lagna.rashi === b.navamsa.lagna.rashi);
  const venusA = a.navamsa?.planets.find((p) => p.id === "venus")?.house ?? null;
  const venusB = b.navamsa?.planets.find((p) => p.id === "venus")?.house ?? null;

  const h7a = a.houses.find((h) => h.number === 7) ?? null;
  const h7b = b.houses.find((h) => h.number === 7) ?? null;

  const mahaA = a.currentDasha?.lord ?? null;
  const mahaB = b.currentDasha?.lord ?? null;
  const antarA = a.currentAntardasha?.lord ?? null;
  const antarB = b.currentAntardasha?.lord ?? null;
  let dashaNote = "Current dasha periods differ — timing for relationship milestones may be staggered.";
  if (mahaA && mahaA === mahaB) {
    dashaNote = `Both are in ${mahaA} mahadasha — shared period flavour for life themes.`;
  } else if (antarA && (antarA === mahaB || antarA === antarB)) {
    dashaNote = `Overlapping dasha lords (${antarA}) — mutual activation window possible.`;
  }

  const advanced: AdvancedMatchLayer = {
    navamsa: {
      lagnaA,
      lagnaB,
      sameNavamsaLagna,
      venusHouseA: venusA,
      venusHouseB: venusB,
      note: sameNavamsaLagna
        ? "Same Navamsa Lagna — strong dharma/marriage-axis resonance in D9."
        : "Different Navamsa Lagnas — weigh D9 Venus and 7th-house strength alongside Ashtakoot.",
    },
    seventhHouse: {
      signA: h7a ? `${h7a.sign}/${h7a.signWestern}` : null,
      signB: h7b ? `${h7b.sign}/${h7b.signWestern}` : null,
      lordA: h7a?.lord ?? null,
      lordB: h7b?.lord ?? null,
      planetsA: h7a?.planets.map((p) => p.short) ?? [],
      planetsB: h7b?.planets.map((p) => p.short) ?? [],
      note: "7th house shows partnership style; compare lords and occupants beyond Moon-nakshatra gunas.",
    },
    dashaOverlap: {
      mahaA,
      mahaB,
      antarA,
      antarB,
      note: dashaNote,
    },
    readingContext: "",
  };

  advanced.readingContext = [
    "ADVANCED MATCH LAYER (beyond Ashtakoot):",
    `D9 Lagna A: ${lagnaA ?? "—"} · B: ${lagnaB ?? "—"} · same D9 Lagna: ${sameNavamsaLagna ? "yes" : "no"}`,
    `D9 Venus house A: ${venusA ?? "—"} · B: ${venusB ?? "—"}`,
    `7th house A: ${advanced.seventhHouse.signA ?? "—"} lord ${advanced.seventhHouse.lordA ?? "—"} planets ${advanced.seventhHouse.planetsA.join(" ") || "—"}`,
    `7th house B: ${advanced.seventhHouse.signB ?? "—"} lord ${advanced.seventhHouse.lordB ?? "—"} planets ${advanced.seventhHouse.planetsB.join(" ") || "—"}`,
    `Dasha A: ${mahaA ?? "—"}–${antarA ?? "—"} · B: ${mahaB ?? "—"}–${antarB ?? "—"} — ${dashaNote}`,
    advanced.navamsa.note,
  ].join("\n");

  return advanced;
}

export async function buildHoroscopeMatch(input: HoroscopeMatchInput): Promise<HoroscopeMatchResult> {
  const [personA, personB] = await Promise.all([
    buildHoroscopeChart(input.personA),
    buildHoroscopeChart(input.personB),
  ]);
  const match = calculateAshtakoot(toMatchPerson(personA), toMatchPerson(personB));
  const advanced = buildAdvancedMatchLayer(personA, personB);
  // Enrich match reading context with advanced layer
  match.readingContext = `${match.readingContext}\n\n${advanced.readingContext}`;
  return { match, advanced, personA, personB };
}
