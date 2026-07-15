/** OpenAI embeddings with keyword-safe fallbacks. Stored as JSON text in SQLite. */

const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const MAX_BATCH = 32;

export function embeddingsAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function serializeEmbedding(vec: number[]): string {
  return JSON.stringify(vec);
}

export function deserializeEmbedding(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === "number")) return null;
    return parsed as number[];
  } catch {
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Embed one or more texts. Returns null entries when embeddings are unavailable or a call fails. */
export async function embedTexts(texts: string[]): Promise<Array<number[] | null>> {
  if (!texts.length) return [];
  if (!embeddingsAvailable()) return texts.map(() => null);

  const key = process.env.OPENAI_API_KEY!;
  const out: Array<number[] | null> = new Array(texts.length).fill(null);

  for (let start = 0; start < texts.length; start += MAX_BATCH) {
    const slice = texts.slice(start, start + MAX_BATCH);
    const inputs = slice.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 8000));
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
      });
      if (!res.ok) {
        console.warn("embeddings failed:", res.status, await res.text().catch(() => ""));
        continue;
      }
      const data = (await res.json()) as {
        data?: Array<{ embedding: number[]; index: number }>;
      };
      for (const row of data.data ?? []) {
        if (typeof row.index === "number" && Array.isArray(row.embedding)) {
          out[start + row.index] = row.embedding;
        }
      }
    } catch (e) {
      console.warn("embeddings error:", e instanceof Error ? e.message : e);
    }
  }
  return out;
}

export async function embedText(text: string): Promise<number[] | null> {
  const [vec] = await embedTexts([text]);
  return vec ?? null;
}
