/**
 * Ashtakoot (North Indian) Guna Milan — 36-point Vedic marriage matching.
 *
 * Classical tables for Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi.
 * Yoni / Varna / Nadi / Bhakoot matrices adapted from the MIT-licensed `ashtakoot`
 * package (Neelesh Roy) with classical corrections for Gana, bidirectional Tara,
 * Vashya groups, Graha Maitri scoring, and Nadi/Bhakoot dosha cancellation notes.
 *
 * Inputs are Moon nakshatra (1–27) and Moon rashi (1–12) from Lahiri sidereal charts.
 */

export interface MatchPersonInput {
  name?: string;
  gender?: "female" | "male" | "other" | "unspecified";
  /** Moon nakshatra number 1–27 (Ashwini…Revati) */
  nakshatra: number;
  nakshatraName: string;
  pada: number;
  /** Moon sign number 1–12 (Mesha…Meena) */
  rashi: number;
  rashiName: string;
  rashiWestern: string;
  /** Optional Mars house from Lagna for Manglik compare */
  manglikFromLagna?: boolean;
  manglikFromMoon?: boolean;
  marsHouse?: number | null;
}

export interface KootaResult {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  personA: string;
  personB: string;
  summary: string;
  detail: string;
  ok: boolean;
}

export interface DoshaNote {
  id: string;
  name: string;
  active: boolean;
  cancelled: boolean;
  reason: string;
}

export interface AshtakootResult {
  system: "Ashtakoot";
  maxScore: number;
  totalScore: number;
  percentage: number;
  band: "excellent" | "very-good" | "good" | "acceptable" | "challenging";
  verdict: string;
  recommended: boolean;
  kootas: KootaResult[];
  doshas: DoshaNote[];
  manglik: {
    personA: boolean;
    personB: boolean;
    status: "none" | "both" | "one-sided";
    note: string;
  };
  people: {
    a: { name: string; nakshatra: string; pada: number; rashi: string; rashiWestern: string };
    b: { name: string; nakshatra: string; pada: number; rashi: string; rashiWestern: string };
  };
  readingContext: string;
  accuracyNote: string;
}

const NAKSHATRA_NAMES = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishtha",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
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

const VARNA_NAMES = ["Brahmin", "Kshatriya", "Vaishya", "Shudra"] as const;
const VASHYA_NAMES = ["Manava", "Vanachara", "Chatushpada", "Jalchar", "Keeta"] as const;
const YONI_NAMES = [
  "Horse",
  "Elephant",
  "Sheep",
  "Serpent",
  "Dog",
  "Cat",
  "Rat",
  "Cow",
  "Buffalo",
  "Tiger",
  "Hare",
  "Monkey",
  "Mongoose",
  "Lion",
] as const;
const GANA_NAMES = ["Deva", "Manushya", "Rakshasa"] as const;
const NADI_NAMES = ["Adi (Vata)", "Madhya (Pitta)", "Antya (Kapha)"] as const;
const LORD_NAMES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;

/** Moon sign → Varna rank (0 Brahmin highest … 3 Shudra). */
function varnaOf(rashi: number): number {
  if ([4, 8, 12].includes(rashi)) return 0;
  if ([1, 5, 9].includes(rashi)) return 1;
  if ([2, 6, 10].includes(rashi)) return 2;
  return 3;
}

/**
 * Classical Vashya groups (degree-agnostic approximation for Capricorn/Leo halves).
 * Leo → Vanachara; Capricorn → Chatushpada (first-half convention).
 */
function vashyaOf(rashi: number): number {
  // 0 Manava, 1 Vanachara, 2 Chatushpada, 3 Jalchar, 4 Keeta
  if ([3, 6, 7, 11].includes(rashi)) return 0; // Gemini, Virgo, Libra, Aquarius
  if ([5, 9].includes(rashi)) return 1; // Leo, Sagittarius
  if ([1, 2, 10].includes(rashi)) return 2; // Aries, Taurus, Capricorn
  if ([4, 12].includes(rashi)) return 3; // Cancer, Pisces
  return 4; // Scorpio
}

/** Same-group = 2; classical cross-group matrix. */
const VASHYA_MATRIX: number[][] = [
  // Manava, Vanachara, Chatushpada, Jalchar, Keeta
  [2, 0.5, 1, 0, 1],
  [0.5, 2, 0, 0, 0],
  [1, 0, 2, 2, 2],
  [0, 0, 2, 2, 0],
  [1, 0, 1, 0, 2],
];

/** Nakshatra 1–27 → Yoni animal index (MIT ashtakoot / classical North). */
const YONI_OF: number[] = [
  0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 11, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1,
];

/**
 * 14×14 Yoni scores (Horse…Lion) — MIT-licensed ashtakoot tables (Neelesh Roy).
 */
const YONI_MATRIX: number[][] = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 1, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 2],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [1, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 2, 4],
];

/** Nakshatra 1–27 → Gana */
function ganaOf(n: number): number {
  if ([1, 5, 7, 8, 13, 15, 17, 22, 27].includes(n)) return 0; // Deva
  if ([2, 4, 6, 11, 12, 20, 21, 25, 26].includes(n)) return 1; // Manushya
  return 2; // Rakshasa
}

/** Classical Gana scores [a][b] */
const GANA_MATRIX: number[][] = [
  [6, 5, 0], // Deva vs D/M/R
  [5, 6, 1], // Manushya
  [0, 1, 6], // Rakshasa
];

/** Nakshatra 1–27 → Nadi (palindromic classical) */
function nadiOf(n: number): number {
  if ([1, 6, 7, 12, 13, 18, 19, 24, 25].includes(n)) return 0; // Adi
  if ([2, 5, 8, 11, 14, 17, 20, 23, 26].includes(n)) return 1; // Madhya
  return 2; // Antya
}

/** Sign lord index into LORD_NAMES */
function lordOf(rashi: number): number {
  const map: Record<number, number> = {
    1: 2,
    2: 5,
    3: 3,
    4: 1,
    5: 0,
    6: 3,
    7: 5,
    8: 2,
    9: 4,
    10: 6,
    11: 6,
    12: 4,
  };
  return map[rashi] ?? 0;
}

/** Natural friendship: 1 friend, 0 neutral, -1 enemy */
const FRIENDSHIP: Record<number, Record<number, number>> = {
  0: { 1: 1, 2: 1, 3: 0, 4: 1, 5: -1, 6: -1 }, // Sun
  1: { 0: 1, 2: 0, 3: 1, 4: 0, 5: 0, 6: 0 }, // Moon
  2: { 0: 1, 1: 1, 3: -1, 4: 1, 5: 0, 6: 0 }, // Mars
  3: { 0: 1, 1: -1, 2: 0, 4: 0, 5: 1, 6: 0 }, // Mercury
  4: { 0: 1, 1: 1, 2: 1, 3: -1, 5: -1, 6: 0 }, // Jupiter
  5: { 0: -1, 1: -1, 2: 0, 3: 1, 4: 0, 6: 1 }, // Venus
  6: { 0: -1, 1: -1, 2: -1, 3: 1, 4: 0, 5: 1 }, // Saturn
};

function maitriScore(lordA: number, lordB: number): number {
  if (lordA === lordB) return 5;
  const ab = FRIENDSHIP[lordA]?.[lordB] ?? 0;
  const ba = FRIENDSHIP[lordB]?.[lordA] ?? 0;
  if (ab === 1 && ba === 1) return 5;
  if ((ab === 1 && ba === 0) || (ab === 0 && ba === 1)) return 4;
  if (ab === 0 && ba === 0) return 3;
  if ((ab === 1 && ba === -1) || (ab === -1 && ba === 1)) return 1;
  if ((ab === 0 && ba === -1) || (ab === -1 && ba === 0)) return 0.5;
  return 0;
}

/** Classical Bhakoot: bad distances 2/12, 5/9, 6/8 → 0; else 7 */
function bhakootScore(rashiA: number, rashiB: number): number {
  let dist = (rashiB - rashiA + 12) % 12; // 0 = same
  // 0-based relative: 1=2nd, 4=5th, 5=6th, 7=8th, 8=9th, 11=12th
  // Bad: 2/12 (dist 1 or 11), 6/8 (dist 5 or 7), 5/9 (dist 4 or 8) — classical North often marks 5/9 as dosha too
  const bad = new Set([1, 4, 5, 7, 8, 11]);
  return bad.has(dist) ? 0 : 7;
}

function taraDirectional(from: number, to: number): number {
  let count = ((to - from + 27) % 27) + 1;
  const rem = count % 9; // 0 ≡ 9 Param Mitra
  // Unfavourable: Vipat(3), Pratyari(5), Vadha/Naidhana(7)
  if (rem === 3 || rem === 5 || rem === 7) return 0;
  return 3;
}

function scoreBand(total: number): AshtakootResult["band"] {
  if (total >= 32) return "excellent";
  if (total >= 25) return "very-good";
  if (total >= 24) return "good";
  if (total >= 18) return "acceptable";
  return "challenging";
}

function verdictFor(total: number, doshas: DoshaNote[]): string {
  const activeNadi = doshas.find((d) => d.id === "nadi" && d.active && !d.cancelled);
  const activeBhakoot = doshas.find((d) => d.id === "bhakoot" && d.active && !d.cancelled);
  if (activeNadi) {
    return "Nadi Dosha is indicated and not cancelled — review with a full chart / Navamsa before relying on the total alone.";
  }
  if (total < 18) {
    return "Below the traditional 18/36 threshold — Ashtakoot alone does not favour the match; weigh 7th house, Venus/Jupiter, and Navamsa carefully.";
  }
  if (activeBhakoot && total < 24) {
    return "Acceptable total, but Bhakoot Dosha is active — check prosperity and emotional rhythm themes in both charts.";
  }
  if (total >= 32) return "Excellent Ashtakoot alignment across most kootas.";
  if (total >= 25) return "Very good match by traditional Guna Milan — strong foundation with normal life work ahead.";
  if (total >= 24) return "Good compatibility on the 36-point scale.";
  return "Acceptable match (18–23). Work the weaker kootas consciously; full kundli still matters more than the number.";
}

export function rashiNumberFromName(name: string): number | null {
  const western = RASHI_WESTERN.findIndex((w) => w.toLowerCase() === name.toLowerCase());
  if (western >= 0) return western + 1;
  const sanskrit = [
    "mesha",
    "vrishabha",
    "mithuna",
    "karka",
    "simha",
    "kanya",
    "tula",
    "vrishchika",
    "dhanu",
    "makara",
    "kumbha",
    "meena",
  ];
  const si = sanskrit.findIndex((s) => s === name.toLowerCase());
  return si >= 0 ? si + 1 : null;
}

export function nakshatraNumberFromName(name: string): number | null {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  const aliases: Record<string, number> = {
    ashwini: 1,
    asvini: 1,
    bharani: 2,
    krittika: 3,
    kritika: 3,
    rohini: 4,
    mrigashira: 5,
    mrigashirsha: 5,
    ardra: 6,
    punarvasu: 7,
    pushya: 8,
    pushyami: 8,
    ashlesha: 9,
    magha: 10,
    "purva phalguni": 11,
    "poorva phalguni": 11,
    "uttara phalguni": 12,
    hasta: 13,
    chitra: 14,
    swati: 15,
    vishakha: 16,
    anuradha: 17,
    jyeshtha: 18,
    jyestha: 18,
    mula: 19,
    moola: 19,
    "purva ashadha": 20,
    "poorva ashadha": 20,
    "uttara ashadha": 21,
    shravana: 22,
    sravana: 22,
    dhanishtha: 23,
    dhanishta: 23,
    shatabhisha: 24,
    satabhisha: 24,
    "purva bhadrapada": 25,
    "uttara bhadrapada": 26,
    revati: 27,
  };
  if (aliases[n] != null) return aliases[n]!;
  const i = NAKSHATRA_NAMES.findIndex((x) => x.toLowerCase() === n);
  return i >= 0 ? i + 1 : null;
}

export function calculateAshtakoot(personA: MatchPersonInput, personB: MatchPersonInput): AshtakootResult {
  const aN = personA.nakshatra;
  const bN = personB.nakshatra;
  const aR = personA.rashi;
  const bR = personB.rashi;
  if (aN < 1 || aN > 27 || bN < 1 || bN > 27) throw new Error("INVALID_NAKSHATRA");
  if (aR < 1 || aR > 12 || bR < 1 || bR > 12) throw new Error("INVALID_RASHI");

  // Traditional Varna: person A treated as "groom" side for hierarchy check.
  const aVarna = varnaOf(aR);
  const bVarna = varnaOf(bR);
  const varnaScore = aVarna <= bVarna ? 1 : 0;

  const aVashya = vashyaOf(aR);
  const bVashya = vashyaOf(bR);
  const vashyaScore = VASHYA_MATRIX[aVashya]![bVashya]!;

  const taraA = taraDirectional(aN, bN);
  const taraB = taraDirectional(bN, aN);
  const taraScore = (taraA + taraB) / 2;

  const aYoniRaw = YONI_OF[aN - 1]!;
  const bYoniRaw = YONI_OF[bN - 1]!;
  const yoniScore = YONI_MATRIX[aYoniRaw]![bYoniRaw]!;

  const aLord = lordOf(aR);
  const bLord = lordOf(bR);
  const grahaScore = maitriScore(aLord, bLord);

  const aGana = ganaOf(aN);
  const bGana = ganaOf(bN);
  const ganaScore = GANA_MATRIX[aGana]![bGana]!;

  const bhakoot = bhakootScore(aR, bR);

  const aNadi = nadiOf(aN);
  const bNadi = nadiOf(bN);
  const nadiScore = aNadi !== bNadi ? 8 : 0;

  const kootas: KootaResult[] = [
    {
      id: "varna",
      name: "Varna",
      score: varnaScore,
      maxScore: 1,
      personA: VARNA_NAMES[aVarna]!,
      personB: VARNA_NAMES[bVarna]!,
      summary: varnaScore ? "Spiritual / ego hierarchy aligns." : "Varna hierarchy mismatch (traditionally).",
      detail: "Compares Moon-sign Varna ranks. Modern readings treat this lightly compared with Nadi and Bhakoot.",
      ok: varnaScore > 0,
    },
    {
      id: "vashya",
      name: "Vashya",
      score: vashyaScore,
      maxScore: 2,
      personA: VASHYA_NAMES[aVashya]!,
      personB: VASHYA_NAMES[bVashya]!,
      summary: vashyaScore >= 1.5 ? "Strong mutual influence." : vashyaScore > 0 ? "Partial attraction pull." : "Weak Vashya pull.",
      detail: "Attraction and mutual influence between Moon-sign creature groups.",
      ok: vashyaScore > 0,
    },
    {
      id: "tara",
      name: "Tara",
      score: taraScore,
      maxScore: 3,
      personA: personA.nakshatraName,
      personB: personB.nakshatraName,
      summary:
        taraScore >= 3
          ? "Both directions auspicious."
          : taraScore >= 1.5
            ? "One direction favourable (averaged)."
            : "Both Tara counts fall in Vipat/Pratyari/Vadha groups.",
      detail: "Bidirectional nakshatra count mod 9 — health and luck harmony.",
      ok: taraScore > 0,
    },
    {
      id: "yoni",
      name: "Yoni",
      score: yoniScore,
      maxScore: 4,
      personA: YONI_NAMES[aYoniRaw]!,
      personB: YONI_NAMES[bYoniRaw]!,
      summary: yoniScore >= 3 ? "Strong instinctive harmony." : yoniScore >= 2 ? "Neutral-friendly yoni." : "Challenging animal pairing.",
      detail: "Physical / instinctive compatibility via nakshatra animal symbols.",
      ok: yoniScore >= 2,
    },
    {
      id: "graha-maitri",
      name: "Graha Maitri",
      score: grahaScore,
      maxScore: 5,
      personA: LORD_NAMES[aLord]!,
      personB: LORD_NAMES[bLord]!,
      summary: grahaScore >= 4 ? "Moon-sign lords are friendly." : grahaScore >= 3 ? "Neutral mental rapport." : "Strained planetary friendship.",
      detail: "Mental compatibility from natural friendship of Chandra-rashi lords.",
      ok: grahaScore >= 3,
    },
    {
      id: "gana",
      name: "Gana",
      score: ganaScore,
      maxScore: 6,
      personA: GANA_NAMES[aGana]!,
      personB: GANA_NAMES[bGana]!,
      summary: ganaScore >= 5 ? "Temperaments mesh well." : ganaScore >= 1 ? "Partial temperament fit." : "Deva–Rakshasa clash.",
      detail: "Deva / Manushya / Rakshasa temperament from birth nakshatra.",
      ok: ganaScore >= 5,
    },
    {
      id: "bhakoot",
      name: "Bhakoot",
      score: bhakoot,
      maxScore: 7,
      personA: personA.rashiName,
      personB: personB.rashiName,
      summary: bhakoot ? "Moon-sign distance supports prosperity themes." : "Bhakoot Dosha (2/12, 5/9, or 6/8 Moon signs).",
      detail: "Long-term emotional / prosperity rhythm from Moon-sign angular distance.",
      ok: bhakoot > 0,
    },
    {
      id: "nadi",
      name: "Nadi",
      score: nadiScore,
      maxScore: 8,
      personA: NADI_NAMES[aNadi]!,
      personB: NADI_NAMES[bNadi]!,
      summary: nadiScore ? "Different Nadis — classical health/progeny green light." : "Same Nadi — Nadi Dosha indicated.",
      detail: "Highest-weighted koota. Same Nadi is the most serious traditional screen.",
      ok: nadiScore > 0,
    },
  ];

  const doshas: DoshaNote[] = [];

  // Nadi dosha + classical soft cancellation hints (Muhurta Martanda style)
  if (nadiScore === 0) {
    let cancelled = false;
    let reason = "Both share the same Nadi.";
    if (aR === bR && aN !== bN) {
      cancelled = true;
      reason = "Same Moon sign, different nakshatras — classical Nadi cancellation hint.";
    } else if (aN === bN && personA.pada !== personB.pada) {
      cancelled = true;
      reason = "Same nakshatra, different padas — classical Nadi cancellation hint.";
    }
    doshas.push({
      id: "nadi",
      name: "Nadi Dosha",
      active: true,
      cancelled,
      reason,
    });
  }

  if (bhakoot === 0) {
    let cancelled = false;
    let reason = "Moon signs form a classical Bhakoot dosha distance (2/12, 5/9, or 6/8).";
    if (aLord === bLord) {
      cancelled = true;
      reason = "Bhakoot dosha cancelled: both Moon signs share the same lord.";
    } else if ((FRIENDSHIP[aLord]?.[bLord] ?? 0) === 1 && (FRIENDSHIP[bLord]?.[aLord] ?? 0) === 1) {
      cancelled = true;
      reason = "Bhakoot dosha cancelled: Moon-sign lords are mutual natural friends.";
    }
    doshas.push({
      id: "bhakoot",
      name: "Bhakoot Dosha",
      active: true,
      cancelled,
      reason,
    });
  }

  if (ganaScore === 0) {
    doshas.push({
      id: "gana",
      name: "Gana mismatch",
      active: true,
      cancelled: false,
      reason: "Deva–Rakshasa gana pairing scores 0 — temperament friction theme.",
    });
  }

  const totalScore = Math.round(kootas.reduce((s, k) => s + k.score, 0) * 10) / 10;
  const percentage = Math.round((totalScore / 36) * 1000) / 10;
  const band = scoreBand(totalScore);

  const aManglik = !!(personA.manglikFromLagna || personA.manglikFromMoon);
  const bManglik = !!(personB.manglikFromLagna || personB.manglikFromMoon);
  let manglikStatus: AshtakootResult["manglik"]["status"] = "none";
  let manglikNote = "Neither chart shows classic Manglik from Lagna/Moon screens.";
  if (aManglik && bManglik) {
    manglikStatus = "both";
    manglikNote = "Both show Manglik indicators — traditionally considered mutually balancing.";
  } else if (aManglik || bManglik) {
    manglikStatus = "one-sided";
    manglikNote = "One-sided Manglik — weigh Mars houses, Venus, and 7th-lord strength beyond Ashtakoot.";
  }

  const activeBlocking = doshas.some((d) => d.id === "nadi" && d.active && !d.cancelled);
  const recommended = totalScore >= 18 && !activeBlocking;

  const people = {
    a: {
      name: personA.name?.trim() || "Person A",
      nakshatra: personA.nakshatraName,
      pada: personA.pada,
      rashi: personA.rashiName,
      rashiWestern: personA.rashiWestern,
    },
    b: {
      name: personB.name?.trim() || "Person B",
      nakshatra: personB.nakshatraName,
      pada: personB.pada,
      rashi: personB.rashiName,
      rashiWestern: personB.rashiWestern,
    },
  };

  const readingContext = [
    "STRUCTURED ASHTAKOOT GUNA MILAN (North Indian, 36 points) — use these exact scores; do not invent different totals.",
    `Person A: ${people.a.name} · Moon ${people.a.rashi}/${people.a.rashiWestern} · ${people.a.nakshatra} p${people.a.pada}`,
    `Person B: ${people.b.name} · Moon ${people.b.rashi}/${people.b.rashiWestern} · ${people.b.nakshatra} p${people.b.pada}`,
    `Total: ${totalScore}/36 (${percentage}%) · Band: ${band} · Recommended by threshold: ${recommended ? "yes" : "no"}`,
    "Kootas:",
    ...kootas.map((k) => `- ${k.name}: ${k.score}/${k.maxScore} · A=${k.personA} · B=${k.personB} — ${k.summary}`),
    doshas.length
      ? `Doshas: ${doshas.map((d) => `${d.name}${d.cancelled ? " (cancelled)" : ""} — ${d.reason}`).join("; ")}`
      : "Doshas: none flagged on Nadi/Bhakoot/Gana screens.",
    `Manglik compare: ${manglikStatus} — ${manglikNote}`,
    "Also discuss 7th house, Venus/Jupiter, Navamsa themes, and current dashas — Ashtakoot is a Moon-nakshatra screen, not the whole marriage chart.",
  ].join("\n");

  return {
    system: "Ashtakoot",
    maxScore: 36,
    totalScore,
    percentage,
    band,
    verdict: verdictFor(totalScore, doshas),
    recommended,
    kootas,
    doshas,
    manglik: { personA: aManglik, personB: bManglik, status: manglikStatus, note: manglikNote },
    people,
    readingContext,
    accuracyNote:
      "Ashtakoot accuracy depends on correct Moon nakshatra (Lahiri). Birth time errors near nakshatra boundaries can change the score. Treat ~90% confidence when birth time and place are precise and Moon is not within ~0.5° of a nakshatra cusp.",
  };
}

void NAKSHATRA_NAMES;
