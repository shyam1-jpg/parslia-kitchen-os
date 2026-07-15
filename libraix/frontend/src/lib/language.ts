/**
 * Frontend copy of language detection (kept in sync with backend language.ts).
 * Used for mic locale + Listen voice language matching.
 */

export type DetectedLanguage = {
  code: string;
  name: string;
  speechLocale: string;
  confidence: "high" | "medium" | "low";
};

const SPEECH_LOCALES: Record<string, string> = {
  en: "en-GB",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  ml: "ml-IN",
  kn: "kn-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  mr: "mr-IN",
  ur: "ur-PK",
  ar: "ar-SA",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  it: "it-IT",
  ru: "ru-RU",
  tr: "tr-TR",
  id: "id-ID",
  th: "th-TH",
  vi: "vi-VN",
  nl: "nl-NL",
  pl: "pl-PL",
  uk: "uk-UA",
  ro: "ro-RO",
  sv: "sv-SE",
  fa: "fa-IR",
  he: "he-IL",
};

const NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  bn: "Bengali",
  gu: "Gujarati",
  pa: "Punjabi",
  mr: "Marathi",
  ur: "Urdu",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  tr: "Turkish",
  id: "Indonesian",
  th: "Thai",
  vi: "Vietnamese",
  nl: "Dutch",
  pl: "Polish",
  uk: "Ukrainian",
  ro: "Romanian",
  sv: "Swedish",
  fa: "Persian",
  he: "Hebrew",
};

function result(code: string, confidence: DetectedLanguage["confidence"]): DetectedLanguage {
  return {
    code,
    name: NAMES[code] ?? code,
    speechLocale: SPEECH_LOCALES[code] ?? code,
    confidence,
  };
}

export function detectLanguage(text: string): DetectedLanguage {
  const sample = text.replace(/\s+/g, " ").trim().slice(0, 800);
  if (!sample) return result("en", "low");

  const counts: Record<string, number> = {};
  const bump = (code: string, n = 1) => {
    counts[code] = (counts[code] ?? 0) + n;
  };

  for (const ch of sample) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x0900 && cp <= 0x097f) bump("hi");
    else if (cp >= 0x0b80 && cp <= 0x0bff) bump("ta");
    else if (cp >= 0x0c00 && cp <= 0x0c7f) bump("te");
    else if (cp >= 0x0d00 && cp <= 0x0d7f) bump("ml");
    else if (cp >= 0x0c80 && cp <= 0x0cff) bump("kn");
    else if (cp >= 0x0980 && cp <= 0x09ff) bump("bn");
    else if (cp >= 0x0a80 && cp <= 0x0aff) bump("gu");
    else if (cp >= 0x0a00 && cp <= 0x0a7f) bump("pa");
    else if (cp >= 0x0600 && cp <= 0x06ff) bump("ar");
    else if (cp >= 0x4e00 && cp <= 0x9fff) bump("zh");
    else if (cp >= 0x3040 && cp <= 0x30ff) bump("ja");
    else if (cp >= 0xac00 && cp <= 0xd7af) bump("ko");
    else if (cp >= 0x0e00 && cp <= 0x0e7f) bump("th");
    else if (cp >= 0x0400 && cp <= 0x04ff) bump("ru");
    else if (cp >= 0x0590 && cp <= 0x05ff) bump("he");
  }

  if ((counts.ar ?? 0) > 0 && /[\u0679\u0688\u0691\u06be\u06d2]|(\b(میں|ہے|کیا|اور)\b)/.test(sample)) {
    bump("ur", 8);
  }
  if ((counts.hi ?? 0) > 0 && /(\b(आहे|मी|तुम्ही|काय)\b)/.test(sample)) {
    bump("mr", 6);
  }

  const lower = sample.toLowerCase();
  if (/\b(the|and|you|what|how|please|thanks|hello)\b/.test(lower)) bump("en", 3);
  if (/\b(el|la|que|hola|gracias|por|como)\b/.test(lower)) bump("es", 4);
  if (/\b(le|la|les|bonjour|merci|pour|comment)\b/.test(lower)) bump("fr", 4);
  if (/\b(der|die|das|und|bitte|danke|wie)\b/.test(lower)) bump("de", 4);
  if (/\b(o|a|que|obrigado|olá|como)\b/.test(lower) && /[ãõç]/i.test(sample)) bump("pt", 5);
  if (/\b(il|la|che|ciao|grazie|come)\b/.test(lower)) bump("it", 4);
  if (/\b(namaste|kya|hai|kaise|dhanyavaad)\b/i.test(lower)) bump("hi", 5);
  if (/\b(vanakkam|eppadi|nandri|enna)\b/i.test(lower)) bump("ta", 5);

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return result(navigator.language?.slice(0, 2) || "en", "low");

  const [top, score] = ranked[0];
  const second = ranked[1]?.[1] ?? 0;
  const confidence =
    score >= 12 && score > second * 1.4 ? "high" : score >= 4 ? "medium" : "low";

  if (top === "ar" && (counts.ur ?? 0) > (counts.ar ?? 0)) return result("ur", confidence);
  return result(top, confidence);
}

export const SPEECH_LANGUAGE_OPTIONS = Object.keys(NAMES).map((code) => ({
  code,
  name: NAMES[code],
  speechLocale: SPEECH_LOCALES[code] ?? code,
}));
