/** Detect when the user wants an image generated in chat (not just text about images). */
export function detectImageRequest(message: string): string | null {
  const text = message.trim();
  if (text.length < 3) return null;

  if (text.startsWith("/image ")) {
    const p = text.slice(7).trim();
    return p.length >= 2 ? p : null;
  }
  if (text.startsWith("/imagine ")) {
    const p = text.slice(9).trim();
    return p.length >= 2 ? p : null;
  }
  if (text.startsWith("/i ")) {
    const p = text.slice(3).trim();
    return p.length >= 2 ? p : null;
  }

  const colon = text.match(/^image\s*:\s*(.+)$/i);
  if (colon?.[1]) {
    const p = colon[1].trim();
    if (p.length >= 2) return p;
  }

  if (/^(what|how|why|when|where|who|explain|describe|tell me about|difference between)\b/i.test(text)) {
    return null;
  }
  if (/\b(google images?|stock photo|copyright|license)\b/i.test(text) && !/\b(generate|create|draw|make|render)\b/i.test(text)) {
    return null;
  }

  const patterns: Array<{ re: RegExp; group?: number }> = [
    { re: /^(?:please\s+)?(?:can you\s+|could you\s+)?(?:quickly\s+)?(?:generate|create|make|draw|design|produce|render|show)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|artwork|logo|poster|drawing|icon)\s*(?:of\s+)?(.+)$/i, group: 1 },
    { re: /^(?:quickly\s+)?render\s+(?:an?\s+)?(?:image|picture)\s*(?:of\s+)?(.+)$/i, group: 1 },
    { re: /^(?:command\s+)?image\s+(?:of\s+)?(.+)$/i, group: 1 },
    { re: /^draw\s+(?:me\s+)?(.+)$/i, group: 1 },
    { re: /^(?:show\s+me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration)\s+of\s+(.+)$/i, group: 1 },
    { re: /^(?:i want|i need)\s+(?:an?\s+)?(?:image|picture|photo)\s+of\s+(.+)$/i, group: 1 },
    { re: /^(?:generate|create|make)\s+(.+)\s+(?:as\s+)?(?:an?\s+)?(?:image|picture|photo)$/i, group: 1 },
    { re: /^(?:generate|create|make)\s+(?:an?\s+)?image\s+(.+)$/i, group: 1 },
    { re: /^(.{3,120})\s+image$/i, group: 1 },
  ];

  for (const { re, group = 1 } of patterns) {
    const m = text.match(re);
    if (m) {
      const prompt = (m[group] ?? text).trim().replace(/[.!?]+$/, "");
      if (prompt.length >= 2) return prompt;
    }
  }

  return null;
}
