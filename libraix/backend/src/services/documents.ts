const MAX_EXTRACT_CHARS = 80_000;
const MAX_LEGAL_EXTRACT_CHARS = 120_000;

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
  "text/rtf",
  "application/rtf",
]);

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|log|rtf)$/i;

const LEGAL_MARKERS =
  /\b(agreement|hereinafter|whereas|party of the first part|governing law|indemnif|confidentiality|non-disclosure|\bnda\b|terms of (service|use)|privacy policy|force majeure|arbitration|jurisdiction|warrant(y|ies)|liability|statute|clause|article\s+\d+|section\s+\d+\.|effective date|counterpart)\b/i;

export interface ParsedDocument {
  filename: string;
  mimeType: string;
  text: string;
  charCount: number;
  truncated: boolean;
  pageCount?: number;
  documentKind?: "legal" | "general";
}

function truncate(text: string, max = MAX_EXTRACT_CHARS): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return {
    text: text.slice(0, max) + "\n\n[Document truncated for length]",
    truncated: true,
  };
}

function detectLegalDocument(filename: string, text: string): boolean {
  if (/\b(contract|agreement|nda|terms|policy|legal|license|msa|sow)\b/i.test(filename)) return true;
  const sample = text.slice(0, 8_000);
  const hits = sample.match(LEGAL_MARKERS);
  return Boolean(hits && hits.length >= 2);
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; pageCount?: number }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text ?? "", pageCount: result.pages?.length ?? result.total };
  } finally {
    await parser.destroy();
  }
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

function stripRtf(raw: string): string {
  return raw
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-z]+\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseDocument(
  filename: string,
  mimeType: string,
  contentBase64: string
): Promise<ParsedDocument> {
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length > 20_000_000) throw new Error("FILE_TOO_LARGE");

  let rawText = "";
  let pageCount: number | undefined;
  const lower = filename.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const extracted = await extractPdf(buffer);
    rawText = extracted.text;
    pageCount = extracted.pageCount;
  } else if (mimeType === DOCX_MIME || lower.endsWith(".docx")) {
    rawText = await extractDocx(buffer);
  } else if (mimeType === DOC_MIME || lower.endsWith(".doc")) {
    // Legacy .doc is binary; try utf8 extract as best-effort (many are OLE — fail clearly)
    const asText = buffer.toString("utf8").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
    if (asText.length < 80) {
      throw new Error("LEGACY_DOC_UNSUPPORTED");
    }
    rawText = asText;
  } else if (mimeType === "text/rtf" || mimeType === "application/rtf" || lower.endsWith(".rtf")) {
    rawText = stripRtf(buffer.toString("utf8"));
  } else if (TEXT_MIMES.has(mimeType) || TEXT_EXTENSIONS.test(filename)) {
    rawText = buffer.toString("utf8");
  } else {
    throw new Error("FILE_TYPE_NOT_SUPPORTED");
  }

  rawText = rawText.replace(/\0/g, "").trim();
  if (!rawText) {
    throw new Error(
      lower.endsWith(".pdf")
        ? "NO_TEXT_EXTRACTED_SCANNED_PDF"
        : "NO_TEXT_EXTRACTED"
    );
  }

  const documentKind = detectLegalDocument(filename, rawText) ? "legal" : "general";
  const maxChars = documentKind === "legal" ? MAX_LEGAL_EXTRACT_CHARS : MAX_EXTRACT_CHARS;
  const { text, truncated } = truncate(rawText, maxChars);

  return {
    filename,
    mimeType,
    text,
    charCount: text.length,
    truncated,
    pageCount,
    documentKind,
  };
}
