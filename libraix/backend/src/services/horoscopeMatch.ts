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

export interface HoroscopeMatchResult {
  match: AshtakootResult;
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

export async function buildHoroscopeMatch(input: HoroscopeMatchInput): Promise<HoroscopeMatchResult> {
  const [personA, personB] = await Promise.all([
    buildHoroscopeChart(input.personA),
    buildHoroscopeChart(input.personB),
  ]);
  const match = calculateAshtakoot(toMatchPerson(personA), toMatchPerson(personB));
  return { match, personA, personB };
}
