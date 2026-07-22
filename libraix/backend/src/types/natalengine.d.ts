declare module "natalengine" {
  export function calculateVedic(
    birthDate: string,
    birthHour?: number,
    timezone?: number,
    latitude?: number | null,
    longitude?: number | null,
  ): VedicChart;

  export function calculateAstrology(
    birthDate: string,
    birthHour?: number,
    timezone?: number,
    latitude?: number | null,
    longitude?: number | null,
  ): {
    bigThree?: string;
    rising?: { sign?: { name?: string }; degree?: string };
    midheaven?: { sign?: { name?: string }; degree?: string };
    aspects?: Array<Record<string, unknown>>;
    balance?: Record<string, unknown>;
  };

  export interface VedicRashi {
    name: string;
    westernName: string;
    symbol: string;
    ruler: string;
    element: string;
    quality: string;
    index?: number;
    degreeInSign?: number;
  }

  export interface VedicNakshatra {
    number: number;
    name: string;
    lord: string;
    deity: string;
    symbol: string;
    pada: number;
    degreeInNakshatra?: number;
    startDegree?: number;
    endDegree?: number;
  }

  export interface VedicPosition {
    longitude: number;
    tropicalLongitude: number;
    degree: string;
    rashi: VedicRashi;
    nakshatra: VedicNakshatra;
  }

  export interface VedicHousePlanet {
    name: string;
    degree: string;
    nakshatra: string;
  }

  export interface VedicHouse {
    sign: VedicRashi;
    planets: VedicHousePlanet[];
  }

  export interface VedicChart {
    positions: Record<string, VedicPosition>;
    ayanamsa: { value: number; formatted: string; system: string };
    moonSign: { rashi: VedicRashi; nakshatra: VedicNakshatra; summary: string };
    dasha: {
      birthLord: string;
      current?: { lord: string; startDate: string; endDate: string; years: number };
      dashas: Array<{ lord: string; startDate: string; endDate: string; years: number; isPartial?: boolean }>;
    };
    houses: Record<string, VedicHouse> | null;
    hasLocation: boolean;
    system: string;
    note: string;
  }
}
