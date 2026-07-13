const MAX_EXTRACT_CHARS = 80_000;

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
]);

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|log)$/i;

export interface ParsedDocument {
  filename: string;
  mimeType: string;
  text: string;
  charCount: number;
  truncated: boolean;
  pageCount?: number;
}

function truncate(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_EXTRACT_CHARS) return { text, truncated: false };
  return {
    text: text.slice(0, MAX_EXTRACT_CHARS) + "\n\n[Document truncated for length]",
    truncated: true,
  };
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

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

export async function parseDocument(
  filename: string,
  mimeType: string,
  contentBase64: string
): Promise<ParsedDocument> {
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length > 15_000_000) throw new Error("FILE_TOO_LARGE");

  let rawText = "";
  let pageCount: number | undefined;

  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    const extracted = await extractPdf(buffer);
    rawText = extracted.text;
    pageCount = extracted.pageCount;
  } else if (mimeType === DOCX_MIME || filename.toLowerCase().endsWith(".docx")) {
    rawText = await extractDocx(buffer);
  } else if (TEXT_MIMES.has(mimeType) || TEXT_EXTENSIONS.test(filename)) {
    rawText = buffer.toString("utf8");
  } else {
    throw new Error("FILE_TYPE_NOT_SUPPORTED");
  }

  rawText = rawText.replace(/\0/g, "").trim();
  if (!rawText) throw new Error("NO_TEXT_EXTRACTED");

  const { text, truncated } = truncate(rawText);
  return {
    filename,
    mimeType,
    text,
    charCount: text.length,
    truncated,
    pageCount,
  };
}
