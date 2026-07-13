/** Detect when the user wants an image generated in chat (not just text about images). */
export function detectImageRequest(message: string): string | null {
  const text = message.trim();
  if (text.length < 4) return null;

  // Skip questions about images / how-to (not generation requests)
  if (/^(what|how|why|when|where|who|explain|describe|tell me about|difference between)\b/i.test(text)) {
    return null;
  }
  if (/\b(google images?|stock photo|copyright|license)\b/i.test(text) && !/\b(generate|create|draw|make)\b/i.test(text)) {
    return null;
  }

  const patterns: Array<{ re: RegExp; group?: number }> = [
    { re: /^(?:please\s+)?(?:can you\s+|could you\s+)?(?:generate|create|make|draw|design|produce|render)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|artwork|logo|poster|drawing|icon)\s*(?:of\s+)?(.+)$/i, group: 1 },
    { re: /^draw\s+(?:me\s+)?(.+)$/i, group: 1 },
    { re: /^(?:show\s+me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration)\s+of\s+(.+)$/i, group: 1 },
    { re: /^(?:i want|i need)\s+(?:an?\s+)?(?:image|picture|photo)\s+of\s+(.+)$/i, group: 1 },
    { re: /^(?:generate|create|make)\s+(.+)\s+(?:as\s+)?(?:an?\s+)?(?:image|picture|photo)$/i, group: 1 },
  ];

  for (const { re, group = 1 } of patterns) {
    const m = text.match(re);
    if (m) {
      const prompt = (m[group] ?? text).trim().replace(/[.!?]+$/, "");
      if (prompt.length >= 3) return prompt;
    }
  }

  return null;
}
