/** Single source of truth for public Libraix messaging. */
export const BRAND = {
  name: "Libraix",
  /** Primary product line — use on hero, tab title, OG */
  tagline: "One AI workspace. Multiple models.",
  /** Short supporting slogan */
  slogan: "Balance meets intelligence.",
  /** Longer SEO / share description */
  description:
    "Libraix is a private AI workspace — Super mode, Agent tools, Live Voice, Live Vision, Deep Research, and model compare in one calm place. Free to start.",
  url: "https://libraix.ai/",
} as const;

export const DOCUMENT_TITLE = `${BRAND.name} — ${BRAND.tagline}`;
